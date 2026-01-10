import { PrismaClient } from '@prisma/client';
import { Asset, AssetConfig } from '../schemas/asset';
import { Finding, FindingStatus, Rule } from '../schemas/finding';
import { RuleRunner } from './rule-runner';
import { DriftEngine } from './drift-engine';

export class EnhancedRuleRunner extends RuleRunner {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  async runScan(
    accountId: string,
    provider: string,
    assets: Asset[],
    configs: Map<string, AssetConfig>
  ): Promise<string> {
    // Create scan record
    const scan = await this.prisma.scan.create({
      data: {
        accountId,
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      const allFindings: Finding[] = [];

      // Process each asset
      for (const asset of assets) {
        const config = configs.get(asset.id!);
        if (!config) continue;

        // Run all applicable rules
        const assetFindings = await this.evaluateAllRules(asset, config);
        
        // Add scan ID to findings
        const findingsWithScanId = assetFindings.map(finding => ({
          ...finding,
          scanId: scan.id,
        }));

        allFindings.push(...findingsWithScanId);

        // Check for drift
        await this.checkForDrift(asset, config);
      }

      // Save findings to database
      if (allFindings.length > 0) {
        await this.saveFindings(allFindings);
      }

      // Update scan status
      await this.prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          summary: {
            totalFindings: allFindings.length,
            passed: allFindings.filter(f => f.status === 'pass').length,
            failed: allFindings.filter(f => f.status === 'fail').length,
            warned: allFindings.filter(f => f.status === 'warn').length,
          },
        },
      });

      return scan.id;
    } catch (error) {
      // Update scan status to failed
      await this.prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          summary: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      });
      throw error;
    }
  }

  private async saveFindings(findings: Finding[]): Promise<void> {
    const dbFindings = findings.map(finding => ({
      scanId: finding.scanId,
      assetId: finding.assetId,
      ruleId: finding.ruleId,
      status: finding.status,
      severity: finding.severity,
      evidence: finding.evidence || {},
    }));

    // Batch insert findings
    for (const finding of dbFindings) {
      await this.prisma.finding.create({
        data: finding,
      });
    }
  }

  private async checkForDrift(asset: Asset, newConfig: AssetConfig): Promise<void> {
    try {
      // Get latest previous config
      const previousConfig = await this.prisma.assetConfig.findFirst({
        where: { assetId: asset.id! },
        orderBy: { collectedAt: 'desc' },
        skip: 1, // Skip the current one if it exists
      });

      if (previousConfig) {
        // Detect drift
        const driftEvent = DriftEngine.detectDrift(
          {
            ...previousConfig,
            collectedAt: previousConfig.collectedAt,
          },
          newConfig
        );

        if (driftEvent) {
          // Save drift event
          await this.prisma.driftEvent.create({
            data: {
              assetId: asset.id!,
              oldConfigId: previousConfig.id,
              newConfigId: newConfig.id!,
              changeType: driftEvent.changeType,
              diff: driftEvent.diff,
              detectedAt: driftEvent.detectedAt,
            },
          });
        }
      }

      // Save the new config
      await this.prisma.assetConfig.create({
        data: {
          assetId: asset.id!,
          configHash: newConfig.configHash,
          rawConfig: newConfig.rawConfig,
          metadata: newConfig.metadata,
        },
      });
    } catch (error) {
      console.error(`Error checking drift for asset ${asset.id}:`, error);
    }
  }

  async getScanResults(scanId: string): Promise<any> {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        findings: {
          include: {
            asset: true,
          },
        },
      },
    });

    if (!scan) {
      throw new Error(`Scan not found: ${scanId}`);
    }

    return scan;
  }

  async getComplianceScore(accountId: string, framework?: string): Promise<number> {
    const latestScan = await this.prisma.scan.findFirst({
      where: { accountId },
      orderBy: { completedAt: 'desc' },
      include: { findings: true },
    });

    if (!latestScan) {
      return 0;
    }

    const totalFindings = latestScan.findings.length;
    const passedFindings = latestScan.findings.filter(f => f.status === 'pass').length;

    return totalFindings > 0 ? (passedFindings / totalFindings) * 100 : 100;
  }
}
