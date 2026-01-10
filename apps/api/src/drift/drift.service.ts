import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaselineManager, EnhancedDriftEngine } from '@cspm/core-engine';

@Injectable()
export class DriftService {
  private baselineManager: BaselineManager;

  constructor(private prisma: PrismaService) {
    this.baselineManager = new BaselineManager(prisma);
  }

  async getDriftEvents(params: {
    assetId?: string;
    changeType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (params.assetId) {
      where.assetId = params.assetId;
    }

    if (params.changeType) {
      where.changeType = params.changeType;
    }

    if (params.startDate || params.endDate) {
      where.detectedAt = {};
      if (params.startDate) {
        where.detectedAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.detectedAt.lte = params.endDate;
      }
    }

    const [drifts, total] = await Promise.all([
      this.prisma.driftEvent.findMany({
        where,
        include: {
          asset: true,
          oldConfig: true,
          newConfig: true,
        },
        orderBy: { detectedAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      this.prisma.driftEvent.count({ where }),
    ]);

    // Enhance drift events with analysis
    const enhancedDrifts = drifts.map(drift => ({
      ...drift,
      analysis: this.analyzeDriftEvent(drift),
      requiresAttention: this.requiresAttention(drift),
    }));

    return {
      drifts: enhancedDrifts,
      total,
      hasMore: (params.offset || 0) + (params.limit || 50) < total,
    };
  }

  async getAssetDriftStatus(assetId: string) {
    const [latestConfig, baseline, recentDrifts] = await Promise.all([
      this.prisma.assetConfig.findFirst({
        where: { assetId },
        orderBy: { collectedAt: 'desc' },
      }),
      this.baselineManager.getCurrentBaseline(assetId),
      this.prisma.driftEvent.findMany({
        where: { assetId },
        take: 5,
        orderBy: { detectedAt: 'desc' },
      }),
    ]);

    if (!latestConfig) {
      return { hasConfig: false };
    }

    let driftAnalysis = null;
    if (baseline) {
      driftAnalysis = await this.baselineManager.compareWithBaseline(
        assetId,
        latestConfig.id
      );
    }

    return {
      hasConfig: true,
      latestConfig,
      baseline: baseline || null,
      driftAnalysis,
      recentDrifts,
      inCompliance: !driftAnalysis?.driftDetected,
      lastChecked: latestConfig.collectedAt,
    };
  }

  async setBaseline(data: {
    assetId: string;
    configId?: string;
    approvedBy: string;
    comment?: string;
    tags?: string[];
  }) {
    let configId = data.configId;

    // If no configId provided, use latest config
    if (!configId) {
      const latestConfig = await this.prisma.assetConfig.findFirst({
        where: { assetId: data.assetId },
        orderBy: { collectedAt: 'desc' },
      });

      if (!latestConfig) {
        throw new Error('No configuration found for asset');
      }

      configId = latestConfig.id;
    }

    return this.baselineManager.setBaseline({
      assetId: data.assetId,
      configId,
      approvedBy: data.approvedBy,
      comment: data.comment,
      tags: data.tags,
    });
  }

  async getBaselineHistory(assetId: string) {
    return this.baselineManager.getBaselineHistory(assetId);
  }

  async revertToBaseline(assetId: string, baselineId: string) {
    return this.baselineManager.revertToBaseline(assetId, baselineId);
  }

  async getDriftSummary(timeRangeHours: number = 24) {
    const [
      statistics,
      recentDrifts,
      assetsWithDrift,
      topDriftingAssets,
    ] = await Promise.all([
      this.baselineManager.getDriftStatistics(timeRangeHours),
      this.prisma.driftEvent.findMany({
        take: 10,
        orderBy: { detectedAt: 'desc' },
        include: { asset: true },
      }),
      this.baselineManager.getAssetsWithDrift(timeRangeHours),
      this.getTopDriftingAssets(timeRangeHours),
    ]);

    return {
      statistics,
      recentDrifts,
      assetsWithDrift: assetsWithDrift.slice(0, 10),
      topDriftingAssets,
      timeRange: `${timeRangeHours}h`,
    };
  }

  async getDriftTimeline(assetId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [configs, drifts, baselines] = await Promise.all([
      this.prisma.assetConfig.findMany({
        where: {
          assetId,
          collectedAt: { gte: startDate },
        },
        orderBy: { collectedAt: 'asc' },
      }),
      this.prisma.driftEvent.findMany({
        where: {
          assetId,
          detectedAt: { gte: startDate },
        },
        orderBy: { detectedAt: 'asc' },
      }),
      this.prisma.baseline.findMany({
        where: {
          assetId,
          approvedAt: { gte: startDate },
        },
        orderBy: { approvedAt: 'asc' },
      }),
    ]);

    // Create timeline entries
    const timeline = [
      ...configs.map(config => ({
        type: 'config_collected' as const,
        timestamp: config.collectedAt,
        data: { configId: config.id, configHash: config.configHash },
      })),
      ...drifts.map(drift => ({
        type: 'drift_detected' as const,
        timestamp: drift.detectedAt,
        data: {
          driftId: drift.id,
          changeType: drift.changeType,
          fromConfig: drift.oldConfigId,
          toConfig: drift.newConfigId,
        },
      })),
      ...baselines.map(baseline => ({
        type: 'baseline_set' as const,
        timestamp: baseline.approvedAt,
        data: {
          baselineId: baseline.id,
          approvedBy: baseline.approvedBy,
          comment: baseline.comment,
        },
      })),
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      timeline,
      configs,
      drifts,
      baselines,
      timeRange: `${days}d`,
    };
  }

  async compareConfigs(configId1: string, configId2: string) {
    const [config1, config2] = await Promise.all([
      this.prisma.assetConfig.findUnique({
        where: { id: configId1 },
      }),
      this.prisma.assetConfig.findUnique({
        where: { id: configId2 },
      }),
    ]);

    if (!config1 || !config2) {
      throw new Error('One or both configurations not found');
    }

    const driftEvent = EnhancedDriftEngine.detectEnhancedDrift(config1, config2);
    
    return {
      config1,
      config2,
      comparison: driftEvent,
      diffView: this.formatDiffForDisplay(driftEvent?.diff),
      isSameAsset: config1.assetId === config2.assetId,
    };
  }

  private async getTopDriftingAssets(timeRangeHours: number) {
    const startTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const driftsByAsset = await this.prisma.driftEvent.groupBy({
      by: ['assetId'],
      where: {
        detectedAt: { gte: startTime },
      },
      _count: true,
      orderBy: {
        _count: {
          assetId: 'desc',
        },
      },
      take: 10,
    });

    // Get asset details
    const assetIds = driftsByAsset.map(d => d.assetId);
    const assets = await this.prisma.asset.findMany({
      where: { id: { in: assetIds } },
    });

    return driftsByAsset.map(drift => {
      const asset = assets.find(a => a.id === drift.assetId);
      return {
        assetId: drift.assetId,
        asset,
        driftCount: drift._count,
      };
    });
  }

  private analyzeDriftEvent(drift: any) {
    const diff = drift.diff;
    if (!diff || typeof diff !== 'object') {
      return { severity: 'low', impact: 'unknown' };
    }

    const diffStr = JSON.stringify(diff).toLowerCase();
    let severity: 'low' | 'medium' | 'high' = 'low';
    let impact = 'configuration';

    // Analyze based on content
    if (diffStr.includes('public') && diffStr.includes('true')) {
      severity = 'high';
      impact = 'security: made resource publicly accessible';
    } else if (diffStr.includes('encryption') && diffStr.includes('false')) {
      severity = 'high';
      impact = 'security: disabled encryption';
    } else if (diffStr.includes('policy') || diffStr.includes('permission')) {
      severity = 'medium';
      impact = 'access: modified permissions or policies';
    } else if (diffStr.includes('tag') || diffStr.includes('label')) {
      severity = 'low';
      impact = 'metadata: changed tags or labels';
    }

    return { severity, impact };
  }

  private requiresAttention(drift: any): boolean {
    const analysis = this.analyzeDriftEvent(drift);
    return analysis.severity === 'high' || 
           drift.changeType === 'security' || 
           drift.changeType === 'compliance';
  }

  private formatDiffForDisplay(diff: any): any {
    if (!diff) return null;

    const formatValue = (value: any): string => {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'string') {
        // Truncate long strings
        return value.length > 100 ? value.substring(0, 100) + '...' : value;
      }
      if (Array.isArray(value)) return `[${value.length} items]`;
      if (typeof value === 'object') return '{...}';
      return String(value);
    };

    const processDiff = (obj: any, path: string = ''): any[] => {
      const changes: any[] = [];

      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (value && typeof value === 'object') {
          if (value.action === 'added') {
            changes.push({
              path: fullPath,
              action: 'added',
              value: formatValue(value.value),
              type: typeof value.value,
            });
          } else if (value.action === 'removed') {
            changes.push({
              path: fullPath,
              action: 'removed',
              value: formatValue(value.value),
              type: typeof value.value,
            });
          } else if (value.action === 'modified') {
            changes.push({
              path: fullPath,
              action: 'modified',
              oldValue: formatValue(value.old),
              newValue: formatValue(value.new),
              type: typeof value.old,
            });
          } else if (value.diff) {
            changes.push(...processDiff(value.diff, fullPath));
          }
        }
      }

      return changes;
    };

    return processDiff(diff);
  }
}
