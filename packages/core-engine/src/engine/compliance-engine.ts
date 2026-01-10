import { PrismaClient } from '@prisma/client';
import { Finding, FindingStatus } from '../schemas/finding';

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description?: string;
}

export interface ComplianceControl {
  id: string;
  frameworkId: string;
  controlId: string;
  title: string;
  description?: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  implementationGuidance?: string;
  auditGuidance?: string;
  references?: string[];
}

export interface RuleComplianceMapping {
  ruleId: string;
  controlId: string;
  mappingType: 'direct' | 'partial' | 'indirect';
  evidenceRequirements?: string[];
}

export interface ComplianceAssessment {
  frameworkId: string;
  accountId: string;
  assessmentDate: Date;
  totalControls: number;
  applicableControls: number;
  implementedControls: number;
  partiallyImplementedControls: number;
  notImplementedControls: number;
  notApplicableControls: number;
  complianceScore: number;
  controls: ComplianceControlAssessment[];
}

export interface ComplianceControlAssessment {
  controlId: string;
  status: 'implemented' | 'partially_implemented' | 'not_implemented' | 'not_applicable' | 'not_assessed';
  evidence: string[];
  findings: string[]; // Finding IDs
  lastAssessed: Date;
  comments?: string;
}

export interface ComplianceTrend {
  date: Date;
  score: number;
  totalControls: number;
  implementedControls: number;
}

export class ComplianceEngine {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async assessCompliance(
    frameworkId: string,
    accountId: string,
    findings: Finding[]
  ): Promise<ComplianceAssessment> {
    // Get all controls for the framework
    const controls = await this.prisma.complianceControl.findMany({
      where: { frameworkId },
      include: {
        ruleMappings: true,
      },
    });

    const controlAssessments: ComplianceControlAssessment[] = [];
    let applicableControls = 0;
    let implementedControls = 0;
    let partiallyImplementedControls = 0;
    let notImplementedControls = 0;
    let notApplicableControls = 0;

    for (const control of controls) {
      // Check if control is applicable (has rule mappings)
      const isApplicable = control.ruleMappings.length > 0;
      
      if (!isApplicable) {
        notApplicableControls++;
        controlAssessments.push({
          controlId: control.id,
          status: 'not_applicable',
          evidence: [],
          findings: [],
          lastAssessed: new Date(),
          comments: 'No rules mapped to this control',
        });
        continue;
      }

      applicableControls++;

      // Find relevant findings for this control
      const relevantRuleIds = control.ruleMappings.map(m => m.ruleId);
      const relevantFindings = findings.filter(f => 
        relevantRuleIds.includes(f.ruleId)
      );

      // Assess control based on findings
      const assessment = this.assessControl(control, relevantFindings);
      controlAssessments.push(assessment);

      // Update counters
      switch (assessment.status) {
        case 'implemented':
          implementedControls++;
          break;
        case 'partially_implemented':
          partiallyImplementedControls++;
          break;
        case 'not_implemented':
          notImplementedControls++;
          break;
      }
    }

    // Calculate compliance score
    const totalAssessed = implementedControls + partiallyImplementedControls + notImplementedControls;
    const complianceScore = totalAssessed > 0 
      ? ((implementedControls + (partiallyImplementedControls * 0.5)) / totalAssessed) * 100
      : 100;

    return {
      frameworkId,
      accountId,
      assessmentDate: new Date(),
      totalControls: controls.length,
      applicableControls,
      implementedControls,
      partiallyImplementedControls,
      notImplementedControls,
      notApplicableControls,
      complianceScore,
      controls: controlAssessments,
    };
  }

  private assessControl(
    control: any,
    findings: Finding[]
  ): ComplianceControlAssessment {
    // Group findings by rule
    const findingsByRule = findings.reduce((acc, finding) => {
      acc[finding.ruleId] = acc[finding.ruleId] || [];
      acc[finding.ruleId].push(finding);
      return acc;
    }, {} as Record<string, Finding[]>);

    // Check if any rules have failures
    const hasFailures = Object.values(findingsByRule).some(ruleFindings =>
      ruleFindings.some(f => f.status === 'fail')
    );

    const hasWarnings = Object.values(findingsByRule).some(ruleFindings =>
      ruleFindings.some(f => f.status === 'warn')
    );

    const allPass = Object.values(findingsByRule).every(ruleFindings =>
      ruleFindings.every(f => f.status === 'pass')
    );

    // Determine status
    let status: ComplianceControlAssessment['status'];
    if (allPass) {
      status = 'implemented';
    } else if (hasWarnings && !hasFailures) {
      status = 'partially_implemented';
    } else if (hasFailures) {
      status = 'not_implemented';
    } else {
      status = 'not_assessed';
    }

    // Collect evidence
    const evidence = findings.map(f => 
      `${f.ruleId}: ${f.status} - ${JSON.stringify(f.evidence)}` 
    );

    return {
      controlId: control.id,
      status,
      evidence,
      findings: findings.map(f => f.id!),
      lastAssessed: new Date(),
      comments: this.generateControlComments(control, findings),
    };
  }

  private generateControlComments(control: any, findings: Finding[]): string {
    const failedFindings = findings.filter(f => f.status === 'fail');
    const warningFindings = findings.filter(f => f.status === 'warn');
    const passedFindings = findings.filter(f => f.status === 'pass');

    const comments: string[] = [];

    if (failedFindings.length > 0) {
      comments.push(`Found ${failedFindings.length} failed checks.`);
    }
    if (warningFindings.length > 0) {
      comments.push(`Found ${warningFindings.length} warnings.`);
    }
    if (passedFindings.length > 0) {
      comments.push(`Passed ${passedFindings.length} checks.`);
    }

    if (comments.length === 0) {
      return 'No relevant findings.';
    }

    return comments.join(' ');
  }

  async getComplianceTrend(
    frameworkId: string,
    accountId: string,
    days: number = 30
  ): Promise<ComplianceTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all scans in the date range
    const scans = await this.prisma.scan.findMany({
      where: {
        accountId,
        status: 'completed',
        completedAt: {
          gte: startDate,
        },
      },
      include: {
        findings: true,
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Group by day and assess compliance
    const trends: ComplianceTrend[] = [];
    const dailyScans = this.groupScansByDay(scans);

    for (const [date, dayScans] of Object.entries(dailyScans)) {
      // Get all findings for the day
      const allFindings = dayScans.flatMap(scan => scan.findings);
      
      // Assess compliance for the day
      const assessment = await this.assessCompliance(
        frameworkId,
        accountId,
        allFindings.map(f => ({
          id: f.id,
          ruleId: f.ruleId,
          status: f.status as FindingStatus,
          severity: f.severity as any,
          evidence: f.evidence as any,
          scanId: f.scanId,
          assetId: f.assetId,
        }))
      );

      trends.push({
        date: new Date(date),
        score: assessment.complianceScore,
        totalControls: assessment.totalControls,
        implementedControls: assessment.implementedControls,
      });
    }

    return trends;
  }

  async getComplianceGapAnalysis(
    frameworkId: string,
    accountId: string
  ): Promise<any> {
    // Get latest compliance assessment
    const latestAssessment = await this.getLatestAssessment(frameworkId, accountId);
    if (!latestAssessment) {
      return null;
    }

    // Get failed controls
    const failedControls = latestAssessment.controls.filter(
      c => c.status === 'not_implemented'
    );

    // Get control details
    const controlDetails = await this.prisma.complianceControl.findMany({
      where: {
        id: {
          in: failedControls.map(c => c.controlId),
        },
      },
      include: {
        framework: true,
        ruleMappings: {
          include: {
            rule: true,
          },
        },
      },
    });

    // Map controls to resources
    const gaps = await Promise.all(
      controlDetails.map(async (control) => {
        // Get related findings
        const findings = await this.prisma.finding.findMany({
          where: {
            id: {
              in: failedControls.find(c => c.controlId === control.id)?.findings || [],
            },
          },
          include: {
            asset: true,
          },
        });

        // Group by resource
        const resourceGroups = findings.reduce((acc, finding) => {
          const resource = finding.asset?.resourceId || 'Unknown';
          if (!acc[resource]) {
            acc[resource] = {
              resourceId: resource,
              service: finding.asset?.service || 'Unknown',
              findings: [],
            };
          }
          acc[resource].findings.push({
            ruleId: finding.ruleId,
            severity: finding.severity,
            evidence: finding.evidence,
          });
          return acc;
        }, {} as Record<string, any>);

        return {
          controlId: control.controlId,
          controlTitle: control.title,
          framework: control.framework.name,
          severity: control.severity,
          implementationGuidance: control.implementationGuidance,
          affectedResources: Object.values(resourceGroups),
          totalResources: Object.keys(resourceGroups).length,
          remediationSteps: this.generateRemediationSteps(control, findings),
        };
      })
    );

    return {
      frameworkId,
      accountId,
      assessmentDate: latestAssessment.assessmentDate,
      totalGaps: gaps.length,
      complianceScore: latestAssessment.complianceScore,
      gaps,
    };
  }

  private async getLatestAssessment(
    frameworkId: string,
    accountId: string
  ): Promise<ComplianceAssessment | null> {
    // In a real implementation, we'd store assessments in the database
    // For now, we'll simulate by getting the latest scan
    const latestScan = await this.prisma.scan.findFirst({
      where: {
        accountId,
        status: 'completed',
      },
      include: {
        findings: true,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    if (!latestScan) {
      return null;
    }

    return this.assessCompliance(
      frameworkId,
      accountId,
      latestScan.findings.map(f => ({
        id: f.id,
        ruleId: f.ruleId,
        status: f.status as FindingStatus,
        severity: f.severity as any,
        evidence: f.evidence as any,
        scanId: f.scanId,
        assetId: f.assetId,
      }))
    );
  }

  private groupScansByDay(scans: any[]): Record<string, any[]> {
    return scans.reduce((acc, scan) => {
      const date = scan.completedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(scan);
      return acc;
    }, {} as Record<string, any[]>);
  }

  private generateRemediationSteps(control: any, findings: any[]): string[] {
    const steps: string[] = [];
    
    steps.push(`### ${control.title}`);
    steps.push(control.description || '');
    
    if (control.implementationGuidance) {
      steps.push('');
      steps.push('**Implementation Guidance:**');
      steps.push(control.implementationGuidance);
    }

    // Add specific remediation based on findings
    if (findings.length > 0) {
      steps.push('');
      steps.push('**Issues Found:**');
      findings.forEach(finding => {
        steps.push(`- ${finding.ruleId}: ${JSON.stringify(finding.evidence)}`);
      });
    }

    if (control.references && control.references.length > 0) {
      steps.push('');
      steps.push('**References:**');
      control.references.forEach((ref: string) => {
        steps.push(`- ${ref}`);
      });
    }

    return steps;
  }

  async exportComplianceReport(
    frameworkId: string,
    accountId: string,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<any> {
    const assessment = await this.getLatestAssessment(frameworkId, accountId);
    if (!assessment) {
      throw new Error('No compliance assessment found');
    }

    const gapAnalysis = await this.getComplianceGapAnalysis(frameworkId, accountId);

    switch (format) {
      case 'json':
        return {
          metadata: {
            generatedAt: new Date(),
            frameworkId,
            accountId,
            format: 'json',
          },
          assessment,
          gapAnalysis,
        };

      case 'csv':
        // Convert to CSV format
        return this.convertToCSV(assessment, gapAnalysis);

      case 'pdf':
        // In real implementation, generate PDF
        throw new Error('PDF export not implemented');

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private convertToCSV(assessment: ComplianceAssessment, gapAnalysis: any): string {
    const headers = [
      'Control ID',
      'Control Title',
      'Status',
      'Compliance Score',
      'Evidence',
      'Remediation Required',
    ];

    const rows = assessment.controls.map(control => [
      control.controlId,
      // We'd need control titles here - in real implementation, join with control table
      'Control Title Placeholder',
      control.status,
      this.calculateControlScore(control.status).toString(),
      control.evidence.join('; '),
      control.status === 'not_implemented' ? 'Yes' : 'No',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  private calculateControlScore(status: string): number {
    switch (status) {
      case 'implemented':
        return 1.0;
      case 'partially_implemented':
        return 0.5;
      case 'not_implemented':
        return 0.0;
      case 'not_applicable':
        return 1.0; // Not applicable counts as compliant
      default:
        return 0.0;
    }
  }

  async getFrameworkCoverage(frameworkId: string): Promise<any> {
    const [controls, rules, mappings] = await Promise.all([
      this.prisma.complianceControl.count({
        where: { frameworkId },
      }),
      this.prisma.$queryRaw`
        SELECT COUNT(DISTINCT rule_id) as rule_count
        FROM rule_compliance_mappings rcm
        JOIN compliance_controls cc ON rcm.control_id = cc.id
        WHERE cc.framework_id = ${frameworkId}
      `,
      this.prisma.ruleComplianceMapping.count({
        where: {
          control: {
            frameworkId,
          },
        },
      }),
    ]);

    const coverage = controls > 0 
      ? (Number((rules as any)[0].rule_count) / controls) * 100
      : 0;

    return {
      totalControls: controls,
      mappedRules: Number((rules as any)[0].rule_count),
      totalMappings: mappings,
      coveragePercentage: coverage,
      coverageLevel: this.getCoverageLevel(coverage),
    };
  }

  private getCoverageLevel(percentage: number): string {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 70) return 'Good';
    if (percentage >= 50) return 'Fair';
    return 'Poor';
  }

  async compareFrameworks(
    frameworkIds: string[],
    accountId: string
  ): Promise<any> {
    const comparisons = await Promise.all(
      frameworkIds.map(async (frameworkId) => {
        const assessment = await this.getLatestAssessment(frameworkId, accountId);
        const coverage = await this.getFrameworkCoverage(frameworkId);
        
        return {
          frameworkId,
          complianceScore: assessment?.complianceScore || 0,
          totalControls: coverage.totalControls,
          mappedControls: coverage.mappedRules,
          coveragePercentage: coverage.coveragePercentage,
          assessmentDate: assessment?.assessmentDate || null,
        };
      })
    );

    // Sort by compliance score
    comparisons.sort((a, b) => b.complianceScore - a.complianceScore);

    return {
      comparisons,
      bestPerforming: comparisons[0],
      worstPerforming: comparisons[comparisons.length - 1],
      averageScore: comparisons.reduce((sum, c) => sum + c.complianceScore, 0) / comparisons.length,
    };
  }
}
