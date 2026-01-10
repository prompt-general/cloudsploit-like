import { PrismaClient } from '@prisma/client';
import { AssetConfig } from '../schemas/asset';

export interface BaselineOptions {
  assetId: string;
  configId: string;
  approvedBy: string;
  comment?: string;
  tags?: string[];
}

export interface BaselineWithConfig {
  id: string;
  assetId: string;
  configId: string;
  config: AssetConfig;
  approvedBy: string;
  approvedAt: Date;
  comment?: string;
  tags?: string[];
  isCurrent: boolean;
}

export class BaselineManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async setBaseline(options: BaselineOptions): Promise<BaselineWithConfig> {
    // Start transaction
    return await this.prisma.$transaction(async (tx) => {
      // Mark any existing baseline as not current
      await tx.baseline.updateMany({
        where: { 
          assetId: options.assetId,
          isCurrent: true 
        },
        data: { isCurrent: false }
      });

      // Create new baseline
      const baseline = await tx.baseline.create({
        data: {
          assetId: options.assetId,
          configId: options.configId,
          approvedBy: options.approvedBy,
          comment: options.comment,
          isCurrent: true,
        },
        include: {
          config: true,
        },
      });

      // Add tags if provided
      if (options.tags && options.tags.length > 0) {
        await this.addBaselineTags(baseline.id, options.tags);
      }

      return this.toBaselineWithConfig(baseline);
    });
  }

  async getCurrentBaseline(assetId: string): Promise<BaselineWithConfig | null> {
    const baseline = await this.prisma.baseline.findFirst({
      where: { 
        assetId, 
        isCurrent: true 
      },
      include: { config: true },
    });

    return baseline ? this.toBaselineWithConfig(baseline) : null;
  }

  async getBaselineHistory(assetId: string, limit: number = 10): Promise<BaselineWithConfig[]> {
    const baselines = await this.prisma.baseline.findMany({
      where: { assetId },
      include: { config: true },
      orderBy: { approvedAt: 'desc' },
      take: limit,
    });

    return baselines.map(b => this.toBaselineWithConfig(b));
  }

  async autoSetBaseline(assetId: string, configId: string): Promise<BaselineWithConfig | null> {
    // Check if baseline already exists
    const existingBaseline = await this.getCurrentBaseline(assetId);
    if (existingBaseline) {
      return null; // Don't auto-set if baseline already exists
    }

    // Auto-set baseline from first configuration
    return await this.setBaseline({
      assetId,
      configId,
      approvedBy: 'system',
      comment: 'Auto-set baseline from initial scan',
      tags: ['auto-generated', 'initial'],
    });
  }

  async revertToBaseline(assetId: string, baselineId: string): Promise<any> {
    const baseline = await this.prisma.baseline.findUnique({
      where: { id: baselineId },
      include: { config: true },
    });

    if (!baseline) {
      throw new Error(`Baseline not found: ${baselineId}`);
    }

    // In a real implementation, this would trigger a revert action
    // For now, return the configuration that should be applied
    return {
      action: 'revert',
      baselineId: baseline.id,
      assetId: baseline.assetId,
      targetConfig: baseline.config.rawConfig,
      revertInstructions: this.generateRevertInstructions(baseline),
    };
  }

  async compareWithBaseline(assetId: string, currentConfigId: string): Promise<any> {
    const baseline = await this.getCurrentBaseline(assetId);
    if (!baseline) {
      return { hasBaseline: false };
    }

    const currentConfig = await this.prisma.assetConfig.findUnique({
      where: { id: currentConfigId },
    });

    if (!currentConfig) {
      throw new Error(`Config not found: ${currentConfigId}`);
    }

    // Use DriftEngine to compare
    const { DriftEngine } = require('./drift-engine');
    const driftEvent = DriftEngine.detectDrift(
      baseline.config,
      currentConfig
    );

    return {
      hasBaseline: true,
      baselineId: baseline.id,
      driftDetected: !!driftEvent,
      driftEvent,
      baselineConfig: baseline.config,
      currentConfig,
    };
  }

  async getAssetsWithDrift(thresholdHours: number = 24): Promise<any[]> {
    // Get assets that have drifted from baseline in the last X hours
    const recentDrifts = await this.prisma.driftEvent.findMany({
      where: {
        detectedAt: {
          gte: new Date(Date.now() - thresholdHours * 60 * 60 * 1000),
        },
      },
      include: {
        asset: {
          include: {
            baseline: {
              include: { config: true },
            },
          },
        },
        newConfig: true,
        oldConfig: true,
      },
      orderBy: { detectedAt: 'desc' },
    });

    // Group by asset and get latest drift
    const assetsWithDrift: any[] = [];
    const assetMap = new Map<string, any>();

    for (const drift of recentDrifts) {
      if (!assetMap.has(drift.assetId)) {
        const baseline = await this.getCurrentBaseline(drift.assetId);
        assetMap.set(drift.assetId, {
          asset: drift.asset,
          latestDrift: drift,
          baseline,
          driftCount: 0,
        });
      }
      
      const assetData = assetMap.get(drift.assetId);
      assetData.driftCount++;
    }

    return Array.from(assetMap.values());
  }

  private async addBaselineTags(baselineId: string, tags: string[]): Promise<void> {
    // Store tags in metadata (in real implementation, create separate table)
    await this.prisma.baseline.update({
      where: { id: baselineId },
      data: {
        comment: `${this.prisma.baseline.findUnique({ where: { id: baselineId } })?.comment || ''} | Tags: ${tags.join(', ')}`,
      },
    });
  }

  private toBaselineWithConfig(baseline: any): BaselineWithConfig {
    return {
      id: baseline.id,
      assetId: baseline.assetId,
      configId: baseline.configId,
      config: {
        ...baseline.config,
        collectedAt: baseline.config.collectedAt,
      },
      approvedBy: baseline.approvedBy,
      approvedAt: baseline.approvedAt,
      comment: baseline.comment,
      isCurrent: baseline.isCurrent,
    };
  }

  private generateRevertInstructions(baseline: any): string[] {
    const instructions: string[] = [];
    const config = baseline.config.rawConfig;
    
    if (config.service === 's3') {
      instructions.push('To revert this S3 bucket configuration:');
      if (config.publicAccessBlock) {
        instructions.push(`- Set public access block: BlockPublicAcls=${config.publicAccessBlock.BlockPublicAcls}`);
        instructions.push(`- Set public access block: BlockPublicPolicy=${config.publicAccessBlock.BlockPublicPolicy}`);
      }
      if (config.encryption) {
        instructions.push('- Enable server-side encryption');
      }
    } else if (config.service === 'iam') {
      instructions.push('To revert this IAM user configuration:');
      if (config.mfaDevices?.length > 0) {
        instructions.push('- Ensure MFA device is enabled');
      }
    }

    instructions.push('\nNote: Automatic revert requires appropriate permissions.');
    return instructions;
  }

  async getDriftStatistics(timeRangeHours: number = 24): Promise<any> {
    const startTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    
    const [drifts, byType, bySeverity] = await Promise.all([
      // Total drift events
      this.prisma.driftEvent.count({
        where: { detectedAt: { gte: startTime } },
      }),
      
      // Drifts by type
      this.prisma.driftEvent.groupBy({
        by: ['changeType'],
        where: { detectedAt: { gte: startTime } },
        _count: true,
      }),
      
      // Drifts by severity (estimated from change type)
      this.prisma.driftEvent.groupBy({
        by: ['changeType'],
        where: { detectedAt: { gte: startTime } },
        _count: true,
      }).then(results => {
        const severityMap: Record<string, number> = { low: 0, medium: 0, high: 0 };
        results.forEach(r => {
          let severity = 'medium';
          if (r.changeType === 'security') severity = 'high';
          if (r.changeType === 'metadata') severity = 'low';
          severityMap[severity] = (severityMap[severity] || 0) + r._count;
        });
        return severityMap;
      }),
    ]);

    return {
      totalDrifts: drifts,
      byType: byType.reduce((acc: any, curr) => {
        acc[curr.changeType || 'unknown'] = curr._count;
        return acc;
      }, {}),
      bySeverity,
      timeRange: `${timeRangeHours}h`,
    };
  }
}
