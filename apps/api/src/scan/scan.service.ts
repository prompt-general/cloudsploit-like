import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AwsAdapter, AwsCollectorConfig } from '@cspm/aws-provider';
import { EnhancedRuleRunner } from '@cspm/core-engine';
import { getRulesByProvider } from '@cspm/rules';

@Injectable()
export class ScanService {
  private ruleRunner: EnhancedRuleRunner;

  constructor(private prisma: PrismaService) {
    this.ruleRunner = new EnhancedRuleRunner(prisma);
  }

  async startScan(provider: string, accountId: string, config: any): Promise<string> {
    // Get or create account
    let account = await this.prisma.account.findFirst({
      where: { provider: provider as any, accountId },
    });

    if (!account) {
      account = await this.prisma.account.create({
        data: {
          provider: provider as any,
          accountId,
          name: config.accountName || `Account ${accountId}`,
          credentials: config.credentials || {},
        },
      });
    }

    // Load rules for provider
    const rules = getRulesByProvider(provider);
    this.ruleRunner.registerRules(rules);

    // Collect assets based on provider
    let assets: any[] = [];
    let assetConfigs = new Map<string, any>();

    switch (provider) {
      case 'aws':
        assets = await this.collectAwsAssets(config);
        assetConfigs = await this.collectAwsConfigs(assets, config);
        break;
      // Add other providers here
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Run scan
    const scanId = await this.ruleRunner.runScan(
      account.id,
      provider,
      assets,
      assetConfigs
    );

    return scanId;
  }

  async getScanStatus(scanId: string): Promise<any> {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        summary: true,
      },
    });

    if (!scan) {
      throw new Error(`Scan not found: ${scanId}`);
    }

    return scan;
  }

  async getScanResults(scanId: string): Promise<any> {
    return this.ruleRunner.getScanResults(scanId);
  }

  async getAccountScans(accountId: string, limit: number = 10): Promise<any[]> {
    return this.prisma.scan.findMany({
      where: { accountId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        findings: {
          select: {
            id: true,
            ruleId: true,
            status: true,
            severity: true,
          },
        },
      },
    });
  }

  private async collectAwsAssets(config: any): Promise<any[]> {
    const awsConfig: AwsCollectorConfig = {
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
        profile: config.profile,
      },
      regions: config.regions || ['us-east-1'],
      services: config.services || ['s3', 'iam'],
    };

    const adapter = new AwsAdapter(awsConfig);
    return adapter.collectAssets();
  }

  private async collectAwsConfigs(assets: any[], config: any): Promise<Map<string, any>> {
    const awsConfig: AwsCollectorConfig = {
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
        profile: config.profile,
      },
    };

    const adapter = new AwsAdapter(awsConfig);
    const configs = new Map<string, any>();

    for (const asset of assets) {
      const config = await adapter.collectConfig(asset);
      configs.set(asset.id, config);
    }

    return configs;
  }

  async getDashboardStats(): Promise<any> {
    const [
      totalScans,
      totalAccounts,
      recentFindings,
      complianceScore,
    ] = await Promise.all([
      this.prisma.scan.count(),
      this.prisma.account.count(),
      this.prisma.finding.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { asset: true },
      }),
      this.getOverallComplianceScore(),
    ]);

    return {
      totalScans,
      totalAccounts,
      recentFindings,
      complianceScore,
    };
  }

  private async getOverallComplianceScore(): Promise<number> {
    const scans = await this.prisma.scan.findMany({
      where: { status: 'completed' },
      include: { findings: true },
    });

    if (scans.length === 0) return 100;

    let totalFindings = 0;
    let passedFindings = 0;

    for (const scan of scans) {
      totalFindings += scan.findings.length;
      passedFindings += scan.findings.filter(f => f.status === 'pass').length;
    }

    return totalFindings > 0 ? (passedFindings / totalFindings) * 100 : 100;
  }
}
