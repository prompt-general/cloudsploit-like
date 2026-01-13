import { Finding } from '../schemas/finding';
import { Asset } from '../schemas/asset';

export interface RiskFactors {
  exploitability: number; // 0-1 scale
  impact: number; // 0-1 scale
  threatIntelligence: number; // 0-1 scale
  businessCriticality: number; // 0-1 scale
  complianceImpact: number; // 0-1 scale
  historicalBreachData: number; // 0-1 scale
}

export interface RiskScore {
  overall: number; // 0-100 scale
  factors: RiskFactors;
  confidence: number; // 0-1 scale
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendations: string[];
  mitreAttackMapping?: string[];
}

export interface MLModelConfig {
  modelWeights: {
    exploitability: number;
    impact: number;
    threatIntelligence: number;
    businessCriticality: number;
    complianceImpact: number;
    historicalBreachData: number;
  };
  thresholds: {
    critical: number;
    high: number;
    medium: number;
  };
}

export class MLRiskPrioritizer {
  private config: MLModelConfig;
  private threatIntelligenceCache: Map<string, number> = new Map();
  private breachDataCache: Map<string, number> = new Map();

  constructor(config?: Partial<MLModelConfig>) {
    this.config = {
      modelWeights: {
        exploitability: 0.25,
        impact: 0.20,
        threatIntelligence: 0.15,
        businessCriticality: 0.15,
        complianceImpact: 0.15,
        historicalBreachData: 0.10,
      },
      thresholds: {
        critical: 80,
        high: 60,
        medium: 40,
      },
      ...config,
    };
  }

  /**
   * Calculate risk score for a single finding
   */
  async calculateRiskScore(finding: Finding, asset: Asset): Promise<RiskScore> {
    const factors = await this.calculateRiskFactors(finding, asset);
    const overall = this.calculateOverallScore(factors);
    const priority = this.determinePriority(overall);
    const recommendations = this.generateRecommendations(finding, factors);
    const mitreAttackMapping = this.getMitreAttackMapping(finding);

    return {
      overall,
      factors,
      confidence: this.calculateConfidence(factors),
      priority,
      recommendations,
      mitreAttackMapping,
    };
  }

  /**
   * Prioritize multiple findings and return top N
   */
  async prioritizeFindings(
    findings: Finding[],
    assets: Asset[],
    topN: number = 5
  ): Promise<{ finding: Finding; asset: Asset; riskScore: RiskScore }[]> {
    const riskScores = [];

    for (const finding of findings) {
      const asset = assets.find(a => a.id === finding.assetId);
      if (!asset) continue;

      const riskScore = await this.calculateRiskScore(finding, asset);
      riskScores.push({ finding, asset, riskScore });
    }

    // Sort by overall risk score (descending)
    riskScores.sort((a, b) => b.riskScore.overall - a.riskScore.overall);

    return riskScores.slice(0, topN);
  }

  /**
   * Calculate individual risk factors
   */
  private async calculateRiskFactors(finding: Finding, asset: Asset): Promise<RiskFactors> {
    const exploitability = this.calculateExploitability(finding);
    const impact = this.calculateImpact(finding, asset);
    const threatIntelligence = await this.getThreatIntelligenceScore(finding);
    const businessCriticality = this.getBusinessCriticality(asset);
    const complianceImpact = this.getComplianceImpact(finding);
    const historicalBreachData = await this.getHistoricalBreachScore(finding);

    return {
      exploitability,
      impact,
      threatIntelligence,
      businessCriticality,
      complianceImpact,
      historicalBreachData,
    };
  }

  /**
   * Calculate exploitability based on CVSS and other factors
   */
  private calculateExploitability(finding: Finding): number {
    let score = 0.5; // Base score

    // CVSS Exploitability metrics
    if (finding.cvss) {
      const { attackVector, attackComplexity, privilegesRequired, userInteraction } = finding.cvss;
      
      // Attack Vector (0-1)
      if (attackVector === 'network') score += 0.3;
      else if (attackVector === 'adjacent') score += 0.2;
      else if (attackVector === 'local') score += 0.1;
      
      // Attack Complexity (0-1)
      if (attackComplexity === 'low') score += 0.2;
      else if (attackComplexity === 'high') score -= 0.1;
      
      // Privileges Required (0-1)
      if (privilegesRequired === 'none') score += 0.2;
      else if (privilegesRequired === 'low') score += 0.1;
      else if (privilegesRequired === 'high') score -= 0.1;
      
      // User Interaction (0-1)
      if (userInteraction === 'none') score += 0.1;
      else if (userInteraction === 'required') score -= 0.1;
    }

    // Service type considerations
    if (finding.service?.includes('public')) score += 0.2;
    if (finding.service?.includes('internet-facing')) score += 0.3;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Calculate impact based on asset criticality and data sensitivity
   */
  private calculateImpact(finding: Finding, asset: Asset): number {
    let score = 0.5; // Base score

    // Asset type impact
    const highImpactTypes = ['database', 'storage', 'authentication', 'network'];
    if (highImpactTypes.includes(asset.type)) score += 0.3;

    // Data classification
    if (asset.tags?.includes('pii')) score += 0.4;
    if (asset.tags?.includes('phi')) score += 0.4;
    if (asset.tags?.includes('financial')) score += 0.3;
    if (asset.tags?.includes('public')) score -= 0.2;

    // Environment
    if (asset.environment === 'production') score += 0.3;
    else if (asset.environment === 'development') score -= 0.2;

    // CVSS Impact metrics
    if (finding.cvss) {
      const { confidentialityImpact, integrityImpact, availabilityImpact } = finding.cvss;
      
      if (confidentialityImpact === 'high') score += 0.2;
      if (integrityImpact === 'high') score += 0.2;
      if (availabilityImpact === 'high') score += 0.2;
    }

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Get threat intelligence score for this vulnerability
   */
  private async getThreatIntelligenceScore(finding: Finding): Promise<number> {
    const cacheKey = `${finding.rule}-${finding.service}`;
    
    if (this.threatIntelligenceCache.has(cacheKey)) {
      return this.threatIntelligenceCache.get(cacheKey)!;
    }

    // Simulate threat intelligence lookup
    // In real implementation, this would call threat intel APIs
    let score = 0.1; // Base score

    // Known exploited vulnerabilities
    if (finding.cve?.some(cve => this.isKnownExploited(cve))) {
      score += 0.6;
    }

    // Recent threat activity
    if (finding.rule?.includes('public') || finding.rule?.includes('exposed')) {
      score += 0.3;
    }

    // Industry-specific threats
    if (finding.service?.includes('ransomware')) score += 0.4;

    this.threatIntelligenceCache.set(cacheKey, score);
    return score;
  }

  /**
   * Get business criticality score for the asset
   */
  private getBusinessCriticality(asset: Asset): number {
    let score = 0.3; // Base score

    // Asset tags indicate business importance
    if (asset.tags?.includes('mission-critical')) score += 0.5;
    if (asset.tags?.includes('revenue-generating')) score += 0.4;
    if (asset.tags?.includes('customer-facing')) score += 0.3;
    if (asset.tags?.includes('internal')) score -= 0.1;

    // Service importance
    const criticalServices = ['database', 'auth', 'payment', 'api'];
    if (criticalServices.some(service => asset.service?.includes(service))) {
      score += 0.3;
    }

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Get compliance impact score
   */
  private getComplianceImpact(finding: Finding): number {
    let score = 0.2; // Base score

    // High-impact compliance frameworks
    const highImpactFrameworks = ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR'];
    if (finding.compliance?.some(f => highImpactFrameworks.includes(f.framework))) {
      score += 0.4;
    }

    // Control criticality
    if (finding.compliance?.some(c => c.control?.startsWith('A') || c.control?.startsWith('CM'))) {
      score += 0.2;
    }

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Get historical breach data score
   */
  private async getHistoricalBreachScore(finding: Finding): Promise<number> {
    const cacheKey = finding.rule;
    
    if (this.breachDataCache.has(cacheKey)) {
      return this.breachDataCache.get(cacheKey)!;
    }

    // Simulate historical breach data analysis
    // In real implementation, this would analyze breach databases
    let score = 0.1; // Base score

    // Common breach vectors
    const breachPatterns = [
      's3-public', 'iam-overprivileged', 'exposed-credentials',
      'unencrypted-data', 'public-database', 'insecure-api'
    ];

    if (breachPatterns.some(pattern => finding.rule?.includes(pattern))) {
      score += 0.5;
    }

    this.breachDataCache.set(cacheKey, score);
    return score;
  }

  /**
   * Calculate overall risk score from factors
   */
  private calculateOverallScore(factors: RiskFactors): number {
    const weights = this.config.modelWeights;
    
    const weightedScore = 
      factors.exploitability * weights.exploitability +
      factors.impact * weights.impact +
      factors.threatIntelligence * weights.threatIntelligence +
      factors.businessCriticality * weights.businessCriticality +
      factors.complianceImpact * weights.complianceImpact +
      factors.historicalBreachData * weights.historicalBreachData;

    return Math.round(weightedScore * 100);
  }

  /**
   * Determine priority level from score
   */
  private determinePriority(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= this.config.thresholds.critical) return 'critical';
    if (score >= this.config.thresholds.high) return 'high';
    if (score >= this.config.thresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence in the risk assessment
   */
  private calculateConfidence(factors: RiskFactors): number {
    // Higher confidence when factors are consistent
    const values = Object.values(factors);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    
    // Lower variance = higher confidence
    return Math.max(0.5, 1 - variance);
  }

  /**
   * Generate remediation recommendations
   */
  private generateRecommendations(finding: Finding, factors: RiskFactors): string[] {
    const recommendations: string[] = [];

    if (factors.exploitability > 0.7) {
      recommendations.push('Immediate remediation required - high exploitability');
    }

    if (factors.impact > 0.7) {
      recommendations.push('Critical asset - implement additional compensating controls');
    }

    if (factors.threatIntelligence > 0.5) {
      recommendations.push('Active threat detected - monitor for exploitation attempts');
    }

    if (factors.complianceImpact > 0.6) {
      recommendations.push('Compliance violation - document remediation for auditors');
    }

    // Add specific recommendations based on finding type
    if (finding.rule?.includes('public')) {
      recommendations.push('Restrict public access and implement network segmentation');
    }

    if (finding.rule?.includes('encryption')) {
      recommendations.push('Enable encryption at rest and in transit');
    }

    return recommendations;
  }

  /**
   * Map to MITRE ATT&CK techniques
   */
  private getMitreAttackMapping(finding: Finding): string[] {
    const mappings: { [key: string]: string[] } = {
      'public': ['T1190', 'T1133'], // Exploit Public-Facing Application, External Remote Services
      'credentials': ['T1078', 'T1552'], // Valid Accounts, Unsecured Credentials
      'iam': ['T1078.004'], // Valid Accounts: Cloud Accounts
      'encryption': ['T1530'], // Data from Cloud Storage Object
      'network': ['T1190', 'T1046'], // Network Service Scanning
      'storage': ['T1530', 'T1537'], // Transfer Data to Cloud Account
    };

    const mapped: string[] = [];
    for (const [pattern, techniques] of Object.entries(mappings)) {
      if (finding.rule?.includes(pattern)) {
        mapped.push(...techniques);
      }
    }

    return [...new Set(mapped)]; // Remove duplicates
  }

  /**
   * Check if CVE is known to be exploited
   */
  private isKnownExploited(cve: string): boolean {
    // Simulate check against CISA KEV catalog
    // In real implementation, this would call the actual API
    const knownExploited = [
      'CVE-2021-44228', 'CVE-2021-45046', 'CVE-2022-22965',
      'CVE-2022-26134', 'CVE-2022-22947'
    ];
    return knownExploited.includes(cve);
  }

  /**
   * Update model configuration
   */
  updateConfig(config: Partial<MLModelConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current model configuration
   */
  getConfig(): MLModelConfig {
    return { ...this.config };
  }
}
