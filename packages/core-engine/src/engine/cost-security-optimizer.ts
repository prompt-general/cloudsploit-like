import { Finding } from '../schemas/finding';
import { Asset } from '../schemas/asset';

export interface CostSecurityMetric {
  assetId: string;
  assetName: string;
  assetType: string;
  provider: string;
  monthlyCost: number;
  securityRiskScore: number;
  costEfficiencyScore: number;
  wastePercentage: number;
  securityWasteCost: number;
  recommendations: CostOptimizationRecommendation[];
  potentialSavings: number;
  riskReduction: number;
}

export interface CostOptimizationRecommendation {
  id: string;
  type: 'rightsize' | 'terminate' | 'modify' | 'migrate' | 'optimize_security';
  title: string;
  description: string;
  estimatedSavings: number;
  implementationCost: number;
  roi: number; // return on investment percentage
  riskReduction: number;
  implementationTime: number; // days
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
}

export interface SecurityWasteAnalysis {
  totalMonthlyCost: number;
  securityWasteCost: number;
  wastePercentage: number;
  wasteCategories: {
    overProvisionedSecurity: number;
    unusedSecurityServices: number;
    redundantSecurityTools: number;
    inefficientConfigurations: number;
  };
  topWasteAssets: CostSecurityMetric[];
}

export interface CostSecurityReport {
  id: string;
  generatedAt: Date;
  timeframe: 'daily' | 'weekly' | 'monthly';
  totalAssets: number;
  totalMonthlyCost: number;
  totalSecurityWaste: number;
  overallEfficiency: number;
  metrics: CostSecurityMetric[];
  analysis: SecurityWasteAnalysis;
  recommendations: CostOptimizationRecommendation[];
  projectedSavings: number;
  implementationRoadmap: ImplementationRoadmap;
}

export interface ImplementationRoadmap {
  phase: string;
  duration: number; // days
  recommendations: CostOptimizationRecommendation[];
  totalSavings: number;
  totalCost: number;
  priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
}

export interface CostSecurityConfig {
  includeSecurityTools: boolean;
  includeComputeResources: boolean;
  includeStorageResources: boolean;
  includeNetworkResources: boolean;
  costThreshold: number;
  riskThreshold: number;
  roiThreshold: number;
  currency: 'USD' | 'EUR' | 'GBP';
}

export class CostSecurityOptimizer {
  private config: CostSecurityConfig;
  private costDataCache: Map<string, any> = new Map();
  private securityMetricsCache: Map<string, number> = new Map();

  constructor(config?: Partial<CostSecurityConfig>) {
    this.config = {
      includeSecurityTools: true,
      includeComputeResources: true,
      includeStorageResources: true,
      includeNetworkResources: true,
      costThreshold: 100,
      riskThreshold: 50,
      roiThreshold: 150,
      currency: 'USD',
      ...config,
    };
  }

  /**
   * Generate comprehensive cost-security optimization report
   */
  async generateCostSecurityReport(
    assets: Asset[],
    findings: Finding[],
    timeframe: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<CostSecurityReport> {
    const metrics = await this.analyzeAssets(assets, findings);
    const analysis = await this.analyzeSecurityWaste(metrics);
    const recommendations = await this.generateRecommendations(metrics, findings);
    const roadmap = this.createImplementationRoadmap(recommendations);

    const projectedSavings = recommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0);

    return {
      id: `report-${Date.now()}`,
      generatedAt: new Date(),
      timeframe,
      totalAssets: assets.length,
      totalMonthlyCost: metrics.reduce((sum, m) => sum + m.monthlyCost, 0),
      totalSecurityWaste: analysis.securityWasteCost,
      overallEfficiency: this.calculateOverallEfficiency(metrics),
      metrics,
      analysis,
      recommendations,
      projectedSavings,
      implementationRoadmap: roadmap,
    };
  }

  /**
   * Analyze individual assets for cost-security metrics
   */
  private async analyzeAssets(
    assets: Asset[],
    findings: Finding[]
  ): Promise<CostSecurityMetric[]> {
    const metrics: CostSecurityMetric[] = [];

    for (const asset of assets) {
      const metric = await this.analyzeAsset(asset, findings);
      metrics.push(metric);
    }

    return metrics.sort((a, b) => b.securityWasteCost - a.securityWasteCost);
  }

  /**
   * Analyze individual asset
   */
  private async analyzeAsset(asset: Asset, findings: Finding[]): Promise<CostSecurityMetric> {
    const monthlyCost = await this.getAssetCost(asset);
    const securityRiskScore = this.calculateSecurityRiskScore(asset, findings);
    const costEfficiencyScore = this.calculateCostEfficiencyScore(asset, monthlyCost);
    const wastePercentage = this.calculateWastePercentage(asset, findings);
    const securityWasteCost = monthlyCost * (wastePercentage / 100);
    const recommendations = await this.generateAssetRecommendations(asset, findings, monthlyCost);
    const potentialSavings = recommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0);
    const riskReduction = recommendations.reduce((sum, rec) => sum + rec.riskReduction, 0);

    return {
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.type,
      provider: asset.provider,
      monthlyCost,
      securityRiskScore,
      costEfficiencyScore,
      wastePercentage,
      securityWasteCost,
      recommendations,
      potentialSavings,
      riskReduction,
    };
  }

  /**
   * Get asset cost from cloud provider APIs
   */
  private async getAssetCost(asset: Asset): Promise<number> {
    const cacheKey = `${asset.provider}-${asset.id}`;
    
    if (this.costDataCache.has(cacheKey)) {
      return this.costDataCache.get(cacheKey);
    }

    // Simulate cost retrieval from cloud provider APIs
    let cost = 0;

    switch (asset.provider) {
      case 'aws':
        cost = this.getAWSCost(asset);
        break;
      case 'azure':
        cost = this.getAzureCost(asset);
        break;
      case 'gcp':
        cost = this.getGCPCost(asset);
        break;
      default:
        cost = this.getGenericCost(asset);
    }

    this.costDataCache.set(cacheKey, cost);
    return cost;
  }

  /**
   * Get AWS resource cost
   */
  private getAWSCost(asset: Asset): number {
    const costMultipliers: Record<string, number> = {
      'ec2': 150,
      'rds': 200,
      's3': 25,
      'lambda': 5,
      'cloudfront': 10,
      'elb': 20,
      'ebs': 30,
      'vpc': 5,
      'iam': 2,
      'cloudwatch': 15,
      'guardduty': 8,
      'security-hub': 5,
      'macie': 12,
    };

    const baseCost = costMultipliers[asset.type] || 50;
    
    // Apply multipliers based on configuration
    let multiplier = 1;
    
    if (asset.properties?.instance_type?.includes('large')) multiplier *= 2;
    if (asset.properties?.instance_type?.includes('xlarge')) multiplier *= 4;
    if (asset.environment === 'production') multiplier *= 1.5;
    if (asset.tags?.includes('high-memory')) multiplier *= 1.3;
    if (asset.tags?.includes('high-cpu')) multiplier *= 1.4;

    return Math.round(baseCost * multiplier);
  }

  /**
   * Get Azure resource cost
   */
  private getAzureCost(asset: Asset): number {
    const costMultipliers: Record<string, number> = {
      'virtual-machine': 160,
      'sql-database': 220,
      'storage-account': 20,
      'function-app': 8,
      'application-gateway': 25,
      'load-balancer': 18,
      'key-vault': 6,
      'monitor': 12,
      'security-center': 10,
      'sentinel': 15,
    };

    const baseCost = costMultipliers[asset.type] || 60;
    
    let multiplier = 1;
    
    if (asset.properties?.vm_size?.includes('Standard_D')) multiplier *= 1.2;
    if (asset.properties?.vm_size?.includes('Standard_E')) multiplier *= 1.8;
    if (asset.environment === 'production') multiplier *= 1.4;
    if (asset.tags?.includes('mission-critical')) multiplier *= 1.6;

    return Math.round(baseCost * multiplier);
  }

  /**
   * Get GCP resource cost
   */
  private getGCPCost(asset: Asset): number {
    const costMultipliers: Record<string, number> = {
      'compute-engine': 140,
      'cloud-sql': 190,
      'cloud-storage': 22,
      'cloud-functions': 6,
      'cloud-load-balancer': 22,
      'cloud-cdn': 12,
      'kms': 5,
      'cloud-monitoring': 10,
      'security-command-center': 8,
      'web-security-scanner': 7,
    };

    const baseCost = costMultipliers[asset.type] || 55;
    
    let multiplier = 1;
    
    if (asset.properties?.machine_type?.includes('n1-standard')) multiplier *= 1.1;
    if (asset.properties?.machine_type?.includes('n1-highmem')) multiplier *= 1.5;
    if (asset.environment === 'production') multiplier *= 1.3;

    return Math.round(baseCost * multiplier);
  }

  /**
   * Get generic resource cost
   */
  private getGenericCost(asset: Asset): number {
    return 100; // Default cost for unknown resource types
  }

  /**
   * Calculate security risk score for asset
   */
  private calculateSecurityRiskScore(asset: Asset, findings: Finding[]): number {
    const assetFindings = findings.filter(f => f.assetId === asset.id);
    
    if (assetFindings.length === 0) return 10;

    const severityScores = { critical: 100, high: 70, medium: 40, low: 10 };
    const totalScore = assetFindings.reduce((sum, finding) => 
      sum + (severityScores[finding.severity as keyof typeof severityScores] || 10), 0
    );

    return Math.min(totalScore, 100);
  }

  /**
   * Calculate cost efficiency score
   */
  private calculateCostEfficiencyScore(asset: Asset, monthlyCost: number): number {
    let efficiency = 100;

    // Reduce efficiency for high-cost assets with low utilization
    if (monthlyCost > 500) efficiency -= 20;
    if (monthlyCost > 1000) efficiency -= 30;

    // Reduce efficiency for oversized resources
    if (asset.properties?.instance_type?.includes('xlarge')) efficiency -= 15;
    if (asset.properties?.storage_gb > 1000) efficiency -= 10;

    // Increase efficiency for well-configured assets
    if (asset.tags?.includes('optimized')) efficiency += 10;
    if (asset.tags?.includes('auto-scaling')) efficiency += 15;

    return Math.max(Math.min(efficiency, 100), 0);
  }

  /**
   * Calculate waste percentage based on security findings
   */
  private calculateWastePercentage(asset: Asset, findings: Finding[]): number {
    const assetFindings = findings.filter(f => f.assetId === asset.id);
    let wastePercentage = 0;

    for (const finding of assetFindings) {
      switch (finding.severity) {
        case 'critical':
          wastePercentage += 25;
          break;
        case 'high':
          wastePercentage += 15;
          break;
        case 'medium':
          wastePercentage += 8;
          break;
        case 'low':
          wastePercentage += 3;
          break;
      }
    }

    // Additional waste based on resource type
    if (asset.type === 'iam' && assetFindings.length > 0) wastePercentage += 10;
    if (asset.type.includes('security') && assetFindings.length > 2) wastePercentage += 15;

    return Math.min(wastePercentage, 80); // Cap at 80%
  }

  /**
   * Generate recommendations for a specific asset
   */
  private async generateAssetRecommendations(
    asset: Asset,
    findings: Finding[],
    monthlyCost: number
  ): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];

    // Security-based recommendations
    const assetFindings = findings.filter(f => f.assetId === asset.id);

    for (const finding of assetFindings) {
      const recommendation = this.generateSecurityRecommendation(asset, finding, monthlyCost);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Cost optimization recommendations
    const costRecommendations = this.generateCostRecommendations(asset, monthlyCost);
    recommendations.push(...costRecommendations);

    return recommendations.filter(rec => rec.estimatedSavings > this.config.costThreshold);
  }

  /**
   * Generate security-based recommendation
   */
  private generateSecurityRecommendation(
    asset: Asset,
    finding: Finding,
    monthlyCost: number
  ): CostOptimizationRecommendation | null {
    const recommendationMap: Record<string, Partial<CostOptimizationRecommendation>> = {
      'overprivileged': {
        type: 'optimize_security',
        title: 'Reduce Overprivileged IAM Permissions',
        description: 'Remove excessive permissions to reduce security risk and potential cost',
        estimatedSavings: monthlyCost * 0.1,
        implementationCost: 50,
        riskReduction: 30,
        implementationTime: 2,
        complexity: 'medium',
      },
      'public': {
        type: 'modify',
        title: 'Restrict Public Access',
        description: 'Remove public access to reduce security risk and compliance costs',
        estimatedSavings: monthlyCost * 0.15,
        implementationCost: 100,
        riskReduction: 40,
        implementationTime: 1,
        complexity: 'low',
      },
      'encryption': {
        type: 'modify',
        title: 'Enable Encryption',
        description: 'Enable encryption to reduce compliance risk and potential breach costs',
        estimatedSavings: monthlyCost * 0.08,
        implementationCost: 75,
        riskReduction: 25,
        implementationTime: 3,
        complexity: 'medium',
      },
      'unused': {
        type: 'terminate',
        title: 'Terminate Unused Security Service',
        description: 'Remove unused security services to eliminate waste',
        estimatedSavings: monthlyCost * 0.9,
        implementationCost: 25,
        riskReduction: 5,
        implementationTime: 1,
        complexity: 'low',
      },
    };

    const rule = finding.rule?.toLowerCase() || '';
    for (const [key, template] of Object.entries(recommendationMap)) {
      if (rule.includes(key)) {
        const roi = Math.round(((template.estimatedSavings! - template.implementationCost!) / template.implementationCost!) * 100);
        
        return {
          id: `rec-${asset.id}-${finding.id}`,
          ...template as CostOptimizationRecommendation,
          roi,
          dependencies: [],
        };
      }
    }

    return null;
  }

  /**
   * Generate cost optimization recommendations
   */
  private generateCostRecommendations(asset: Asset, monthlyCost: number): CostOptimizationRecommendation[] {
    const recommendations: CostOptimizationRecommendation[] = [];

    // Right-sizing recommendations
    if (asset.properties?.instance_type?.includes('xlarge')) {
      recommendations.push({
        id: `rec-${asset.id}-rightsize`,
        type: 'rightsize',
        title: 'Right-size Overprovisioned Resource',
        description: 'Reduce resource size to match actual usage patterns',
        estimatedSavings: monthlyCost * 0.4,
        implementationCost: 150,
        roi: 107,
        riskReduction: 10,
        implementationTime: 7,
        complexity: 'medium',
        dependencies: [],
      });
    }

    // Unused resource recommendations
    if (asset.tags?.includes('unused') || asset.tags?.includes('idle')) {
      recommendations.push({
        id: `rec-${asset.id}-terminate`,
        type: 'terminate',
        title: 'Terminate Unused Resource',
        description: 'Remove resource that is not being used',
        estimatedSavings: monthlyCost * 0.95,
        implementationCost: 50,
        roi: 171,
        riskReduction: 5,
        implementationTime: 1,
        complexity: 'low',
        dependencies: [],
      });
    }

    // Migration recommendations
    if (asset.provider === 'aws' && asset.type === 'ec2' && monthlyCost > 200) {
      recommendations.push({
        id: `rec-${asset.id}-migrate`,
        type: 'migrate',
        title: 'Migrate to Graviton Processors',
        description: 'Migrate to AWS Graviton processors for better price-performance',
        estimatedSavings: monthlyCost * 0.2,
        implementationCost: 200,
        roi: 20,
        riskReduction: 0,
        implementationTime: 14,
        complexity: 'high',
        dependencies: ['compatibility-check'],
      });
    }

    return recommendations;
  }

  /**
   * Analyze overall security waste
   */
  private async analyzeSecurityWaste(metrics: CostSecurityMetric[]): Promise<SecurityWasteAnalysis> {
    const totalMonthlyCost = metrics.reduce((sum, m) => sum + m.monthlyCost, 0);
    const securityWasteCost = metrics.reduce((sum, m) => sum + m.securityWasteCost, 0);
    const wastePercentage = totalMonthlyCost > 0 ? (securityWasteCost / totalMonthlyCost) * 100 : 0;

    const wasteCategories = {
      overProvisionedSecurity: 0,
      unusedSecurityServices: 0,
      redundantSecurityTools: 0,
      inefficientConfigurations: 0,
    };

    // Categorize waste (simplified)
    for (const metric of metrics) {
      if (metric.assetType.includes('security')) {
        wasteCategories.unusedSecurityServices += metric.securityWasteCost * 0.6;
        wasteCategories.redundantSecurityTools += metric.securityWasteCost * 0.4;
      } else {
        wasteCategories.overProvisionedSecurity += metric.securityWasteCost * 0.5;
        wasteCategories.inefficientConfigurations += metric.securityWasteCost * 0.5;
      }
    }

    const topWasteAssets = metrics
      .sort((a, b) => b.securityWasteCost - a.securityWasteCost)
      .slice(0, 10);

    return {
      totalMonthlyCost,
      securityWasteCost,
      wastePercentage,
      wasteCategories,
      topWasteAssets,
    };
  }

  /**
   * Generate overall recommendations
   */
  private async generateRecommendations(
    metrics: CostSecurityMetric[],
    findings: Finding[]
  ): Promise<CostOptimizationRecommendation[]> {
    const allRecommendations: CostOptimizationRecommendation[] = [];

    // Collect all recommendations from assets
    for (const metric of metrics) {
      allRecommendations.push(...metric.recommendations);
    }

    // Add strategic recommendations
    const strategicRecs = this.generateStrategicRecommendations(metrics, findings);
    allRecommendations.push(...strategicRecs);

    // Sort by ROI and impact
    return allRecommendations
      .filter(rec => rec.roi >= this.config.roiThreshold)
      .sort((a, b) => {
        if (b.roi !== a.roi) return b.roi - a.roi;
        return b.riskReduction - a.riskReduction;
      });
  }

  /**
   * Generate strategic recommendations
   */
  private generateStrategicRecommendations(
    metrics: CostSecurityMetric[],
    findings: Finding[]
  ): CostOptimizationRecommendation[] {
    const recommendations: CostOptimizationRecommendation[] = [];

    // Consolidate security tools
    const securityTools = metrics.filter(m => m.assetType.includes('security'));
    if (securityTools.length > 5) {
      const totalSecurityCost = securityTools.reduce((sum, m) => sum + m.monthlyCost, 0);
      
      recommendations.push({
        id: 'rec-strategic-consolidate',
        type: 'optimize_security',
        title: 'Consolidate Security Tools',
        description: 'Reduce redundant security tools by consolidating vendors',
        estimatedSavings: totalSecurityCost * 0.3,
        implementationCost: 5000,
        roi: 60,
        riskReduction: 15,
        implementationTime: 90,
        complexity: 'high',
        dependencies: ['vendor-evaluation', 'migration-planning'],
      });
    }

    // Implement automation
    const highRiskAssets = metrics.filter(m => m.securityRiskScore > 70);
    if (highRiskAssets.length > 10) {
      recommendations.push({
        id: 'rec-strategic-automation',
        type: 'optimize_security',
        title: 'Implement Security Automation',
        description: 'Automate security remediation to reduce manual overhead',
        estimatedSavings: 2000,
        implementationCost: 8000,
        roi: 25,
        riskReduction: 35,
        implementationTime: 60,
        complexity: 'medium',
        dependencies: ['tool-selection', 'integration'],
      });
    }

    return recommendations;
  }

  /**
   * Create implementation roadmap
   */
  private createImplementationRoadmap(
    recommendations: CostOptimizationRecommendation[]
  ): ImplementationRoadmap[] {
    const phases: ImplementationRoadmap[] = [
      {
        phase: 'Immediate Quick Wins',
        duration: 30,
        recommendations: recommendations.filter(r => r.complexity === 'low' && r.implementationTime <= 7),
        totalSavings: 0,
        totalCost: 0,
        priority: 'immediate',
      },
      {
        phase: 'Short-term Optimizations',
        duration: 90,
        recommendations: recommendations.filter(r => r.complexity === 'medium' && r.implementationTime <= 30),
        totalSavings: 0,
        totalCost: 0,
        priority: 'short_term',
      },
      {
        phase: 'Medium-term Strategic Initiatives',
        duration: 180,
        recommendations: recommendations.filter(r => r.complexity === 'medium' && r.implementationTime > 30),
        totalSavings: 0,
        totalCost: 0,
        priority: 'medium_term',
      },
      {
        phase: 'Long-term Transformations',
        duration: 365,
        recommendations: recommendations.filter(r => r.complexity === 'high'),
        totalSavings: 0,
        totalCost: 0,
        priority: 'long_term',
      },
    ];

    // Calculate totals for each phase
    phases.forEach(phase => {
      phase.totalSavings = phase.recommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0);
      phase.totalCost = phase.recommendations.reduce((sum, rec) => sum + rec.implementationCost, 0);
    });

    return phases.filter(phase => phase.recommendations.length > 0);
  }

  /**
   * Calculate overall efficiency score
   */
  private calculateOverallEfficiency(metrics: CostSecurityMetric[]): number {
    if (metrics.length === 0) return 0;

    const totalCost = metrics.reduce((sum, m) => sum + m.monthlyCost, 0);
    const totalWaste = metrics.reduce((sum, m) => sum + m.securityWasteCost, 0);
    const avgEfficiency = metrics.reduce((sum, m) => sum + m.costEfficiencyScore, 0) / metrics.length;

    const wastePenalty = totalCost > 0 ? (totalWaste / totalCost) * 100 : 0;
    
    return Math.max(Math.round(avgEfficiency - wastePenalty), 0);
  }

  /**
   * Get top cost-saving opportunities
   */
  getTopSavingsOpportunities(report: CostSecurityReport, limit: number = 10): CostOptimizationRecommendation[] {
    return report.recommendations
      .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
      .slice(0, limit);
  }

  /**
   * Get top risk reduction opportunities
   */
  getTopRiskReductionOpportunities(report: CostSecurityReport, limit: number = 10): CostOptimizationRecommendation[] {
    return report.recommendations
      .sort((a, b) => b.riskReduction - a.riskReduction)
      .slice(0, limit);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CostSecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CostSecurityConfig {
    return { ...this.config };
  }
}
