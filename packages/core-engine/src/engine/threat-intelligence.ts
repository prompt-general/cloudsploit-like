import { Finding } from '../schemas/finding';
import { Asset } from '../schemas/asset';

export interface ThreatIntelligenceFeed {
  id: string;
  name: string;
  description: string;
  provider: 'cisa_kev' | 'vulndb' | 'cve' | 'custom';
  url?: string;
  apiKey?: string;
  enabled: boolean;
  updateFrequency: number; // hours
  lastUpdated: Date;
  threatTypes: ThreatType[];
  reliability: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
}

export interface ThreatType {
  category: 'vulnerability' | 'malware' | 'apt' | 'campaign' | 'indicator' | 'actor';
  severity: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
}

export interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'certificate' | 'cve';
  value: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
  context: ThreatContext;
  mitigations: string[];
  references: string[];
}

export interface ThreatContext {
  malwareFamilies?: string[];
  threatActors?: string[];
  campaigns?: string[];
  attackPatterns?: string[];
  techniques?: string[];
  tactics?: string[];
  industries?: string[];
  countries?: string[];
}

export interface VulnerabilityIntelligence {
  cve: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvss: number;
  description: string;
  publishedDate: Date;
  modifiedDate: Date;
  exploited: boolean;
  exploitability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  affectedProducts: string[];
  references: string[];
  patches: VulnerabilityPatch[];
  mitigations: string[];
  threatActors: string[];
  campaigns: string[];
}

export interface VulnerabilityPatch {
  productId: string;
  version: string;
  releaseDate: Date;
  downloadUrl?: string;
  notes: string;
}

export interface ThreatIntelligenceMatch {
  indicator: ThreatIndicator;
  asset: Asset;
  finding: Finding;
  matchType: 'direct' | 'indirect' | 'contextual';
  confidence: number;
  riskScore: number;
  recommendations: string[];
  mitigations: string[];
}

export interface ThreatIntelligenceReport {
  id: string;
  generatedAt: Date;
  timeframe: {
    start: Date;
    end: Date;
  };
  summary: {
    totalIndicators: number;
    criticalThreats: number;
    highThreats: number;
    mediumThreats: number;
    lowThreats: number;
    exploitedVulnerabilities: number;
    activeCampaigns: number;
  };
  matches: ThreatIntelligenceMatch[];
  trends: ThreatTrend[];
  recommendations: ThreatRecommendation[];
  riskAssessment: RiskAssessment;
}

export interface ThreatTrend {
  category: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  timeframe: string;
  description: string;
}

export interface ThreatRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  category: 'prevention' | 'detection' | 'response' | 'recovery';
  implementation: string[];
  estimatedEffort: number; // days
  dependencies: string[];
  riskReduction: number; // percentage
}

export interface RiskAssessment {
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: RiskFactor[];
  emergingThreats: EmergingThreat[];
  exposureScore: number;
  resilienceScore: number;
}

export interface RiskFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  affectedAssets: number;
  mitigations: string[];
}

export interface EmergingThreat {
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
  timeframe: string;
  indicators: string[];
  mitigations: string[];
}

export interface ThreatIntelligenceConfig {
  enableCISAKEV: boolean;
  enableVulnDB: boolean;
  enableCVE: boolean;
  enableCustomFeeds: boolean;
  updateInterval: number; // hours
  retentionDays: number;
  enableRealTimeUpdates: boolean;
  enableContextualAnalysis: boolean;
  enableTrendAnalysis: boolean;
  riskThreshold: number;
}

export class ThreatIntelligenceEngine {
  private config: ThreatIntelligenceConfig;
  private feeds: Map<string, ThreatIntelligenceFeed> = new Map();
  private indicators: Map<string, ThreatIndicator[]> = new Map();
  private vulnerabilities: Map<string, VulnerabilityIntelligence> = new Map();
  private matches: Map<string, ThreatIntelligenceMatch[]> = new Map();
  private reports: Map<string, ThreatIntelligenceReport> = new Map();

  constructor(config?: Partial<ThreatIntelligenceConfig>) {
    this.config = {
      enableCISAKEV: true,
      enableVulnDB: true,
      enableCVE: true,
      enableCustomFeeds: true,
      updateInterval: 6,
      retentionDays: 365,
      enableRealTimeUpdates: true,
      enableContextualAnalysis: true,
      enableTrendAnalysis: true,
      riskThreshold: 70,
      ...config,
    };

    this.initializeDefaultFeeds();
  }

  /**
   * Initialize threat intelligence feeds
   */
  async initializeFeeds(): Promise<void> {
    if (this.config.enableCISAKEV) {
      await this.initializeCISAKEVFeed();
    }

    if (this.config.enableVulnDB) {
      await this.initializeVulnDBFeed();
    }

    if (this.config.enableCVE) {
      await this.initializeCVEFeed();
    }

    // Start periodic updates
    if (this.config.enableRealTimeUpdates) {
      this.startPeriodicUpdates();
    }
  }

  /**
   * Analyze findings against threat intelligence
   */
  async analyzeThreatIntelligence(
    findings: Finding[],
    assets: Asset[]
  ): Promise<ThreatIntelligenceMatch[]> {
    const matches: ThreatIntelligenceMatch[] = [];

    for (const finding of findings) {
      const asset = assets.find(a => a.id === finding.assetId);
      if (!asset) continue;

      const findingMatches = await this.matchFindingToThreats(finding, asset);
      matches.push(...findingMatches);
    }

    // Store matches
    for (const asset of assets) {
      const assetMatches = matches.filter(m => m.asset.id === asset.id);
      this.matches.set(asset.id, assetMatches);
    }

    return matches.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Generate threat intelligence report
   */
  async generateThreatIntelligenceReport(
    matches: ThreatIntelligenceMatch[],
    timeframe: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }
  ): Promise<ThreatIntelligenceReport> {
    const summary = this.calculateReportSummary(matches);
    const trends = this.calculateThreatTrends(matches, timeframe);
    const recommendations = this.generateThreatRecommendations(matches);
    const riskAssessment = this.calculateRiskAssessment(matches);

    const report: ThreatIntelligenceReport = {
      id: `threat-report-${Date.now()}`,
      generatedAt: new Date(),
      timeframe,
      summary,
      matches,
      trends,
      recommendations,
      riskAssessment,
    };

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Match finding to threat intelligence
   */
  private async matchFindingToThreats(
    finding: Finding,
    asset: Asset
  ): Promise<ThreatIntelligenceMatch[]> {
    const matches: ThreatIntelligenceMatch[] = [];

    // Match by CVE
    if (finding.cve) {
      for (const cve of finding.cve) {
        const vulnerability = this.vulnerabilities.get(cve);
        if (vulnerability) {
          const match = this.createVulnerabilityMatch(vulnerability, finding, asset);
          matches.push(match);
        }
      }
    }

    // Match by service/technology
    const serviceMatches = await this.matchByService(finding, asset);
    matches.push(...serviceMatches);

    // Match by configuration patterns
    const configMatches = await this.matchByConfiguration(finding, asset);
    matches.push(...configMatches);

    // Contextual matching
    if (this.config.enableContextualAnalysis) {
      const contextualMatches = await this.performContextualMatching(finding, asset);
      matches.push(...contextualMatches);
    }

    return matches;
  }

  /**
   * Create vulnerability match
   */
  private createVulnerabilityMatch(
    vulnerability: VulnerabilityIntelligence,
    finding: Finding,
    asset: Asset
  ): ThreatIntelligenceMatch {
    const indicator: ThreatIndicator = {
      id: `vuln-${vulnerability.cve}`,
      type: 'cve',
      value: vulnerability.cve,
      description: vulnerability.description,
      severity: vulnerability.severity,
      confidence: vulnerability.exploited ? 'high' : 'medium',
      source: 'CVE Database',
      firstSeen: vulnerability.publishedDate,
      lastSeen: vulnerability.modifiedDate,
      tags: ['vulnerability', 'exploited', 'patch-available'],
      context: {
        attackPatterns: this.getAttackPatternsForVulnerability(vulnerability),
        techniques: this.getTechniquesForVulnerability(vulnerability),
        industries: this.getAffectedIndustries(vulnerability),
      },
      mitigations: vulnerability.mitigations,
      references: vulnerability.references,
    };

    const riskScore = this.calculateVulnerabilityRiskScore(vulnerability, finding);
    const recommendations = this.generateVulnerabilityRecommendations(vulnerability);

    return {
      indicator,
      asset,
      finding,
      matchType: vulnerability.exploited ? 'direct' : 'indirect',
      confidence: vulnerability.exploited ? 0.9 : 0.7,
      riskScore,
      recommendations,
      mitigations: vulnerability.mitigations,
    };
  }

  /**
   * Match by service/technology
   */
  private async matchByService(finding: Finding, asset: Asset): Promise<ThreatIntelligenceMatch[]> {
    const matches: ThreatIntelligenceMatch[] = [];
    const service = finding.service?.toLowerCase() || '';

    // Service-specific threat indicators
    const serviceThreats = this.getServiceSpecificThreats(service);
    
    for (const threat of serviceThreats) {
      const match: ThreatIntelligenceMatch = {
        indicator: threat,
        asset,
        finding,
        matchType: 'contextual',
        confidence: 0.6,
        riskScore: this.calculateContextualRiskScore(threat, finding),
        recommendations: this.generateContextualRecommendations(threat),
        mitigations: threat.mitigations,
      };
      matches.push(match);
    }

    return matches;
  }

  /**
   * Match by configuration patterns
   */
  private async matchByConfiguration(finding: Finding, asset: Asset): Promise<ThreatIntelligenceMatch[]> {
    const matches: ThreatIntelligenceMatch[] = [];
    const rule = finding.rule?.toLowerCase() || '';

    // Configuration-based threat patterns
    const configThreats = this.getConfigurationBasedThreats(rule);
    
    for (const threat of configThreats) {
      const match: ThreatIntelligenceMatch = {
        indicator: threat,
        asset,
        finding,
        matchType: 'indirect',
        confidence: 0.5,
        riskScore: this.calculateContextualRiskScore(threat, finding),
        recommendations: this.generateContextualRecommendations(threat),
        mitigations: threat.mitigations,
      };
      matches.push(match);
    }

    return matches;
  }

  /**
   * Perform contextual matching
   */
  private async performContextualMatching(
    finding: Finding,
    asset: Asset
  ): Promise<ThreatIntelligenceMatch[]> {
    const matches: ThreatIntelligenceMatch[] = [];

    // Industry-specific threats
    const industryThreats = this.getIndustrySpecificThreats(asset);
    for (const threat of industryThreats) {
      const match: ThreatIntelligenceMatch = {
        indicator: threat,
        asset,
        finding,
        matchType: 'contextual',
        confidence: 0.4,
        riskScore: this.calculateContextualRiskScore(threat, finding),
        recommendations: this.generateContextualRecommendations(threat),
        mitigations: threat.mitigations,
      };
      matches.push(match);
    }

    return matches;
  }

  /**
   * Initialize CISA KEV feed
   */
  private async initializeCISAKEVFeed(): Promise<void> {
    const feed: ThreatIntelligenceFeed = {
      id: 'cisa-kev',
      name: 'CISA Known Exploited Vulnerabilities',
      description: 'CISA catalog of known exploited vulnerabilities',
      provider: 'cisa_kev',
      url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      enabled: true,
      updateFrequency: 24,
      lastUpdated: new Date(),
      threatTypes: [
        { category: 'vulnerability', severity: 'critical', tags: ['exploited', 'kev'] },
        { category: 'vulnerability', severity: 'high', tags: ['exploited', 'kev'] },
      ],
      reliability: 'high',
      confidence: 'high',
    };

    this.feeds.set(feed.id, feed);

    // Fetch initial data
    await this.fetchCISAKEVData();
  }

  /**
   * Initialize VulnDB feed
   */
  private async initializeVulnDBFeed(): Promise<void> {
    const feed: ThreatIntelligenceFeed = {
      id: 'vulndb',
      name: 'VulnDB Vulnerability Database',
      description: 'Commercial vulnerability database with detailed analysis',
      provider: 'vulndb',
      url: 'https://vulndb.cyberriskanalytics.com',
      apiKey: process.env.VULNDB_API_KEY,
      enabled: true,
      updateFrequency: 12,
      lastUpdated: new Date(),
      threatTypes: [
        { category: 'vulnerability', severity: 'critical', tags: ['vulndb'] },
        { category: 'vulnerability', severity: 'high', tags: ['vulndb'] },
        { category: 'vulnerability', severity: 'medium', tags: ['vulndb'] },
      ],
      reliability: 'high',
      confidence: 'high',
    };

    this.feeds.set(feed.id, feed);
  }

  /**
   * Initialize CVE feed
   */
  private async initializeCVEFeed(): Promise<void> {
    const feed: ThreatIntelligenceFeed = {
      id: 'cve',
      name: 'National Vulnerability Database (NVD)',
      description: 'CVE database from NIST with CVSS scores',
      provider: 'cve',
      url: 'https://nvd.nist.gov/vuln/data-feeds',
      enabled: true,
      updateFrequency: 6,
      lastUpdated: new Date(),
      threatTypes: [
        { category: 'vulnerability', severity: 'critical', tags: ['cve'] },
        { category: 'vulnerability', severity: 'high', tags: ['cve'] },
        { category: 'vulnerability', severity: 'medium', tags: ['cve'] },
        { category: 'vulnerability', severity: 'low', tags: ['cve'] },
      ],
      reliability: 'high',
      confidence: 'medium',
    };

    this.feeds.set(feed.id, feed);
  }

  /**
   * Fetch CISA KEV data
   */
  private async fetchCISAKEVData(): Promise<void> {
    // Simulate fetching CISA KEV data
    // In real implementation, this would call the actual API
    const mockData: VulnerabilityIntelligence[] = [
      {
        cve: 'CVE-2023-1234',
        severity: 'critical',
        cvss: 9.8,
        description: 'Critical vulnerability in widely used library',
        publishedDate: new Date('2023-06-15'),
        modifiedDate: new Date('2023-06-20'),
        exploited: true,
        exploitability: 'high',
        impact: 'high',
        affectedProducts: ['Apache Tomcat', 'Spring Boot'],
        references: ['https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-1234'],
        patches: [
          {
            productId: 'apache-tomcat',
            version: '9.0.82',
            releaseDate: new Date('2023-06-16'),
            downloadUrl: 'https://tomcat.apache.org/download-90.cgi',
            notes: 'Security fix for CVE-2023-1234',
          },
        ],
        mitigations: [
          'Update to patched version',
          'Implement network segmentation',
          'Monitor for exploitation attempts',
        ],
        threatActors: ['APT29', 'Lazarus Group'],
        campaigns: ['Supply Chain Attacks 2023'],
      },
      {
        cve: 'CVE-2023-5678',
        severity: 'high',
        cvss: 8.5,
        description: 'High severity vulnerability in cloud service',
        publishedDate: new Date('2023-07-10'),
        modifiedDate: new Date('2023-07-15'),
        exploited: true,
        exploitability: 'medium',
        impact: 'high',
        affectedProducts: ['AWS SDK', 'Azure Storage'],
        references: ['https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-5678'],
        patches: [
          {
            productId: 'aws-sdk',
            version: '2.1500.0',
            releaseDate: new Date('2023-07-12'),
            notes: 'Security update for CVE-2023-5678',
          },
        ],
        mitigations: [
          'Update SDK to latest version',
          'Implement input validation',
          'Review access permissions',
        ],
        threatActors: ['FIN7'],
        campaigns: ['Cloud Service Exploitation'],
      },
    ];

    for (const vuln of mockData) {
      this.vulnerabilities.set(vuln.cve, vuln);
    }
  }

  /**
   * Get service-specific threats
   */
  private getServiceSpecificThreats(service: string): ThreatIndicator[] {
    const threats: ThreatIndicator[] = [];

    if (service.includes('s3') || service.includes('storage')) {
      threats.push({
        id: 's3-public-access',
        type: 'indicator',
        value: 'public-s3-bucket',
        description: 'Public S3 buckets are targeted by attackers for data exfiltration',
        severity: 'high',
        confidence: 'medium',
        source: 'Threat Intelligence',
        firstSeen: new Date('2023-01-01'),
        lastSeen: new Date(),
        tags: ['s3', 'storage', 'data-exfiltration'],
        context: {
          attackPatterns: ['Data from Cloud Storage'],
          techniques: ['T1530'],
          tactics: ['Collection'],
          industries: ['technology', 'healthcare', 'finance'],
        },
        mitigations: [
          'Restrict public access',
          'Enable encryption',
          'Implement access logging',
        ],
        references: ['https://attack.mitre.org/techniques/T1530/'],
      });
    }

    if (service.includes('iam') || service.includes('identity')) {
      threats.push({
        id: 'iam-privilege-escalation',
        type: 'indicator',
        value: 'overprivileged-iam',
        description: 'Overprivileged IAM roles are targeted for privilege escalation',
        severity: 'critical',
        confidence: 'high',
        source: 'Threat Intelligence',
        firstSeen: new Date('2023-01-01'),
        lastSeen: new Date(),
        tags: ['iam', 'privilege-escalation', 'identity'],
        context: {
          attackPatterns: ['Valid Accounts'],
          techniques: ['T1078.004'],
          tactics: ['Privilege Escalation', 'Defense Evasion'],
          industries: ['all'],
        },
        mitigations: [
          'Apply principle of least privilege',
          'Regular permission audits',
          'Implement MFA',
        ],
        references: ['https://attack.mitre.org/techniques/T1078/004/'],
      });
    }

    return threats;
  }

  /**
   * Get configuration-based threats
   */
  private getConfigurationBasedThreats(rule: string): ThreatIndicator[] {
    const threats: ThreatIndicator[] = [];

    if (rule.includes('public') || rule.includes('exposed')) {
      threats.push({
        id: 'public-exposure',
        type: 'indicator',
        value: 'publicly-exposed-service',
        description: 'Publicly exposed services are targeted for initial access',
        severity: 'high',
        confidence: 'medium',
        source: 'Threat Intelligence',
        firstSeen: new Date('2023-01-01'),
        lastSeen: new Date(),
        tags: ['public', 'exposure', 'initial-access'],
        context: {
          attackPatterns: ['Exploit Public-Facing Application'],
          techniques: ['T1190'],
          tactics: ['Initial Access'],
          industries: ['all'],
        },
        mitigations: [
          'Restrict public access',
          'Implement authentication',
          'Use WAF',
        ],
        references: ['https://attack.mitre.org/techniques/T1190/'],
      });
    }

    return threats;
  }

  /**
   * Get industry-specific threats
   */
  private getIndustrySpecificThreats(asset: Asset): ThreatIndicator[] {
    const threats: ThreatIndicator[] = [];
    const tags = asset.tags || [];

    if (tags.includes('healthcare') || tags.includes('phi')) {
      threats.push({
        id: 'healthcare-data-theft',
        type: 'indicator',
        value: 'healthcare-data-target',
        description: 'Healthcare organizations are targeted for PHI theft',
        severity: 'high',
        confidence: 'medium',
        source: 'Threat Intelligence',
        firstSeen: new Date('2023-01-01'),
        lastSeen: new Date(),
        tags: ['healthcare', 'phi', 'data-theft'],
        context: {
          attackPatterns: ['Data from Information Repositories'],
          techniques: ['T1213'],
          tactics: ['Collection'],
          industries: ['healthcare'],
        },
        mitigations: [
          'Encrypt PHI at rest and in transit',
          'Implement access controls',
          'Monitor data access',
        ],
        references: ['https://attack.mitre.org/techniques/T1213/'],
      });
    }

    if (tags.includes('financial') || tags.includes('pci')) {
      threats.push({
        id: 'financial-data-theft',
        type: 'indicator',
        value: 'financial-data-target',
        description: 'Financial organizations are targeted for payment card data',
        severity: 'critical',
        confidence: 'high',
        source: 'Threat Intelligence',
        firstSeen: new Date('2023-01-01'),
        lastSeen: new Date(),
        tags: ['financial', 'pci', 'payment-data'],
        context: {
          attackPatterns: ['Collection of Data from Information Repositories'],
          techniques: ['T1005'],
          tactics: ['Collection'],
          industries: ['finance', 'retail'],
        },
        mitigations: [
          'Implement PCI-DSS controls',
          'Encrypt payment data',
          'Monitor transaction patterns',
        ],
        references: ['https://attack.mitre.org/techniques/T1005/'],
      });
    }

    return threats;
  }

  /**
   * Calculate vulnerability risk score
   */
  private calculateVulnerabilityRiskScore(
    vulnerability: VulnerabilityIntelligence,
    finding: Finding
  ): number {
    let score = vulnerability.cvss * 10; // Scale CVSS to 0-100

    // Boost if exploited
    if (vulnerability.exploited) {
      score += 20;
    }

    // Boost if high exploitability
    if (vulnerability.exploitability === 'high') {
      score += 15;
    }

    // Boost if high impact
    if (vulnerability.impact === 'high') {
      score += 10;
    }

    // Boost if finding is critical
    if (finding.severity === 'critical') {
      score += 10;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate contextual risk score
   */
  private calculateContextualRiskScore(indicator: ThreatIndicator, finding: Finding): number {
    let score = 50; // Base score

    // Adjust by severity
    const severityScores = { critical: 30, high: 20, medium: 10, low: 5 };
    score += severityScores[indicator.severity] || 0;

    // Adjust by confidence
    const confidenceScores = { high: 15, medium: 10, low: 5 };
    score += confidenceScores[indicator.confidence] || 0;

    // Adjust by finding severity
    const findingScores = { critical: 20, high: 15, medium: 10, low: 5 };
    score += findingScores[finding.severity as keyof typeof findingScores] || 0;

    return Math.min(score, 100);
  }

  /**
   * Generate vulnerability recommendations
   */
  private generateVulnerabilityRecommendations(vulnerability: VulnerabilityIntelligence): string[] {
    const recommendations: string[] = [];

    if (vulnerability.exploited) {
      recommendations.push('🚨 URGENT: This vulnerability is actively being exploited');
    }

    if (vulnerability.patches.length > 0) {
      recommendations.push(`Apply available patches: ${vulnerability.patches.map(p => p.version).join(', ')}`);
    }

    recommendations.push(...vulnerability.mitigations);

    if (vulnerability.threatActors.length > 0) {
      recommendations.push(`Monitor for activity by: ${vulnerability.threatActors.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Generate contextual recommendations
   */
  private generateContextualRecommendations(indicator: ThreatIndicator): string[] {
    const recommendations: string[] = [];

    recommendations.push(...indicator.mitigations);

    if (indicator.context.techniques && indicator.context.techniques.length > 0) {
      recommendations.push(`Monitor for MITRE ATT&CK techniques: ${indicator.context.techniques.join(', ')}`);
    }

    if (indicator.context.threatActors && indicator.context.threatActors.length > 0) {
      recommendations.push(`Enhance monitoring for threat actors: ${indicator.context.threatActors.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Get attack patterns for vulnerability
   */
  private getAttackPatternsForVulnerability(vulnerability: VulnerabilityIntelligence): string[] {
    // Map vulnerability types to attack patterns
    const patterns: string[] = [];

    if (vulnerability.cve.includes('rce') || vulnerability.description.includes('remote code')) {
      patterns.push('Remote Code Execution');
    }

    if (vulnerability.cve.includes('xss') || vulnerability.description.includes('cross-site')) {
      patterns.push('Cross-Site Scripting');
    }

    if (vulnerability.cve.includes('sql') || vulnerability.description.includes('injection')) {
      patterns.push('SQL Injection');
    }

    return patterns;
  }

  /**
   * Get techniques for vulnerability
   */
  private getTechniquesForVulnerability(vulnerability: VulnerabilityIntelligence): string[] {
    // Map vulnerability to MITRE ATT&CK techniques
    const techniques: string[] = [];

    if (vulnerability.exploited) {
      techniques.push('T1190'); // Exploit Public-Facing Application
    }

    if (vulnerability.description.includes('privilege')) {
      techniques.push('T1068'); // Exploitation for Privilege Escalation
    }

    return techniques;
  }

  /**
   * Get affected industries
   */
  private getAffectedIndustries(vulnerability: VulnerabilityIntelligence): string[] {
    // Based on affected products, determine industries
    const industries: string[] = [];

    if (vulnerability.affectedProducts.some(p => p.includes('healthcare') || p.includes('medical'))) {
      industries.push('healthcare');
    }

    if (vulnerability.affectedProducts.some(p => p.includes('financial') || p.includes('banking'))) {
      industries.push('finance');
    }

    if (vulnerability.affectedProducts.some(p => p.includes('retail') || p.includes('ecommerce'))) {
      industries.push('retail');
    }

    return industries.length > 0 ? industries : ['technology'];
  }

  /**
   * Calculate report summary
   */
  private calculateReportSummary(matches: ThreatIntelligenceMatch[]): ThreatIntelligenceReport['summary'] {
    const summary = {
      totalIndicators: matches.length,
      criticalThreats: matches.filter(m => m.indicator.severity === 'critical').length,
      highThreats: matches.filter(m => m.indicator.severity === 'high').length,
      mediumThreats: matches.filter(m => m.indicator.severity === 'medium').length,
      lowThreats: matches.filter(m => m.indicator.severity === 'low').length,
      exploitedVulnerabilities: matches.filter(m => 
        m.indicator.type === 'cve' && 
        (m.indicator as any).exploited
      ).length,
      activeCampaigns: matches.filter(m => 
        m.indicator.context.campaigns && m.indicator.context.campaigns.length > 0
      ).length,
    };

    return summary;
  }

  /**
   * Calculate threat trends
   */
  private calculateThreatTrends(
    matches: ThreatIntelligenceMatch[],
    timeframe: { start: Date; end: Date }
  ): ThreatTrend[] {
    const trends: ThreatTrend[] = [];

    // Analyze severity distribution changes
    const criticalCount = matches.filter(m => m.indicator.severity === 'critical').length;
    const totalCount = matches.length;

    if (criticalCount > totalCount * 0.2) {
      trends.push({
        category: 'Critical Threats',
        trend: 'increasing',
        changePercentage: 25,
        timeframe: '30 days',
        description: 'Critical threats are increasing in the environment',
      });
    }

    return trends;
  }

  /**
   * Generate threat recommendations
   */
  private generateThreatRecommendations(matches: ThreatIntelligenceMatch[]): ThreatRecommendation[] {
    const recommendations: ThreatRecommendation[] = [];

    // Prioritized recommendations based on matches
    const criticalMatches = matches.filter(m => m.indicator.severity === 'critical');
    if (criticalMatches.length > 0) {
      recommendations.push({
        id: 'urgent-patch-management',
        priority: 'critical',
        title: 'Implement Urgent Patch Management',
        description: 'Address critical vulnerabilities that are actively being exploited',
        category: 'response',
        implementation: [
          'Identify all systems with critical vulnerabilities',
          'Apply emergency patches where available',
          'Implement compensating controls for unpatchable systems',
          'Increase monitoring for exploitation attempts',
        ],
        estimatedEffort: 7,
        dependencies: ['change-management', 'backup-systems'],
        riskReduction: 80,
      });
    }

    return recommendations;
  }

  /**
   * Calculate risk assessment
   */
  private calculateRiskAssessment(matches: ThreatIntelligenceMatch[]): RiskAssessment {
    const avgRiskScore = matches.reduce((sum, m) => sum + m.riskScore, 0) / matches.length;
    
    const overallRisk = avgRiskScore >= 80 ? 'critical' :
                       avgRiskScore >= 60 ? 'high' :
                       avgRiskScore >= 40 ? 'medium' : 'low';

    const riskFactors: RiskFactor[] = [
      {
        factor: 'Exploited Vulnerabilities',
        impact: 'high',
        description: 'Presence of actively exploited vulnerabilities',
        affectedAssets: matches.filter(m => m.indicator.type === 'cve').length,
        mitigations: ['Patch management', 'Compensating controls'],
      },
    ];

    const emergingThreats: EmergingThreat[] = [
      {
        name: 'AI-Powered Attacks',
        description: 'Increasing use of AI in attack automation',
        severity: 'high',
        likelihood: 'medium',
        timeframe: '6-12 months',
        indicators: ['anomalous-behavior', 'automated-attacks'],
        mitigations: ['AI-based detection', 'Behavioral analysis'],
      },
    ];

    return {
      overallRisk,
      riskFactors,
      emergingThreats,
      exposureScore: Math.round(avgRiskScore),
      resilienceScore: Math.max(0, 100 - Math.round(avgRiskScore)),
    };
  }

  /**
   * Start periodic updates
   */
  private startPeriodicUpdates(): void {
    setInterval(async () => {
      try {
        await this.updateFeeds();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to update threat intelligence feeds:', error);
      }
    }, this.config.updateInterval * 60 * 60 * 1000);
  }

  /**
   * Update all feeds
   */
  private async updateFeeds(): Promise<void> {
    for (const feed of this.feeds.values()) {
      if (feed.enabled) {
        await this.updateFeed(feed);
      }
    }
  }

  /**
   * Update individual feed
   */
  private async updateFeed(feed: ThreatIntelligenceFeed): Promise<void> {
    // In real implementation, this would fetch data from the feed
    feed.lastUpdated = new Date();
  }

  /**
   * Initialize default feeds
   */
  private initializeDefaultFeeds(): void {
    // Feeds will be initialized on-demand
  }

  /**
   * Get all feeds
   */
  getFeeds(): ThreatIntelligenceFeed[] {
    return Array.from(this.feeds.values());
  }

  /**
   * Get matches for asset
   */
  getMatchesForAsset(assetId: string): ThreatIntelligenceMatch[] {
    return this.matches.get(assetId) || [];
  }

  /**
   * Get all reports
   */
  getReports(): ThreatIntelligenceReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ThreatIntelligenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ThreatIntelligenceConfig {
    return { ...this.config };
  }
}
