import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComplianceEngine } from '@cspm/core-engine';
import { FRAMEWORKS, getFrameworkIds } from '@cspm/compliance';

@Injectable()
export class ComplianceService {
  private complianceEngine: ComplianceEngine;

  constructor(private prisma: PrismaService) {
    this.complianceEngine = new ComplianceEngine(prisma);
  }

  async getFrameworks() {
    const frameworks = await this.prisma.complianceFramework.findMany({
      include: {
        _count: {
          select: {
            controls: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get coverage for each framework
    const frameworksWithCoverage = await Promise.all(
      frameworks.map(async (framework) => {
        const coverage = await this.getFrameworkCoverage(framework.id);
        return {
          ...framework,
          coverage,
        };
      })
    );

    return frameworksWithCoverage;
  }

  async getFrameworkDetails(frameworkId: string) {
    const framework = await this.prisma.complianceFramework.findUnique({
      where: { id: frameworkId },
      include: {
        controls: {
          orderBy: {
            controlId: 'asc',
          },
          include: {
            _count: {
              select: {
                ruleMappings: true,
              },
            },
          },
        },
      },
    });

    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`);
    }

    const coverage = await this.getFrameworkCoverage(frameworkId);
    const predefinedFramework = FRAMEWORKS[frameworkId];

    return {
      ...framework,
      coverage,
      isPredefined: !!predefinedFramework,
      predefinedDefinition: predefinedFramework?.framework,
    };
  }

  async assessCompliance(frameworkId: string, accountId: string) {
    // Get latest scan findings for account
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
      throw new Error(`No completed scans found for account: ${accountId}`);
    }

    // Convert findings to the format expected by ComplianceEngine
    const findings = latestScan.findings.map(finding => ({
      id: finding.id,
      ruleId: finding.ruleId,
      status: finding.status as any,
      severity: finding.severity as any,
      evidence: finding.evidence as any,
      scanId: finding.scanId,
      assetId: finding.assetId,
    }));

    // Perform compliance assessment
    const assessment = await this.complianceEngine.assessCompliance(
      frameworkId,
      accountId,
      findings
    );

    // Store assessment result (in real implementation)
    await this.storeAssessmentResult(assessment);

    return assessment;
  }

  async getComplianceTrend(frameworkId: string, accountId: string, days: number = 30) {
    return this.complianceEngine.getComplianceTrend(frameworkId, accountId, days);
  }

  async getComplianceGapAnalysis(frameworkId: string, accountId: string) {
    return this.complianceEngine.getComplianceGapAnalysis(frameworkId, accountId);
  }

  async getFrameworkCoverage(frameworkId: string) {
    return this.complianceEngine.getFrameworkCoverage(frameworkId);
  }

  async compareFrameworks(frameworkIds: string[], accountId: string) {
    return this.complianceEngine.compareFrameworks(frameworkIds, accountId);
  }

  async exportComplianceReport(
    frameworkId: string,
    accountId: string,
    format: 'json' | 'csv' | 'pdf'
  ) {
    return this.complianceEngine.exportComplianceReport(frameworkId, accountId, format);
  }

  async getControlDetails(controlId: string) {
    const control = await this.prisma.complianceControl.findUnique({
      where: { id: controlId },
      include: {
        framework: true,
        ruleMappings: {
          include: {
            rule: true,
          },
        },
      },
    });

    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    // Get related findings across all accounts
    const relatedFindings = await this.prisma.finding.groupBy({
      by: ['status'],
      where: {
        ruleId: {
          in: control.ruleMappings.map(m => m.ruleId),
        },
      },
      _count: {
        status: true,
      },
    });

    return {
      ...control,
      statistics: {
        totalFindings: relatedFindings.reduce((sum, group) => sum + group._count.status, 0),
        byStatus: relatedFindings.reduce((acc, group) => {
          acc[group.status] = group._count.status;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  async getAccountComplianceSummary(accountId: string) {
    const frameworks = await this.prisma.complianceFramework.findMany();
    
    const assessments = await Promise.all(
      frameworks.map(async (framework) => {
        try {
          const assessment = await this.assessCompliance(framework.id, accountId);
          const coverage = await this.getFrameworkCoverage(framework.id);
          
          return {
            frameworkId: framework.id,
            frameworkName: framework.name,
            frameworkVersion: framework.version,
            complianceScore: assessment.complianceScore,
            totalControls: assessment.totalControls,
            implementedControls: assessment.implementedControls,
            partiallyImplementedControls: assessment.partiallyImplementedControls,
            coveragePercentage: coverage.coveragePercentage,
            lastAssessed: assessment.assessmentDate,
          };
        } catch (error) {
          // If no data for this framework, return default values
          return {
            frameworkId: framework.id,
            frameworkName: framework.name,
            frameworkVersion: framework.version,
            complianceScore: 0,
            totalControls: 0,
            implementedControls: 0,
            partiallyImplementedControls: 0,
            coveragePercentage: 0,
            lastAssessed: null,
          };
        }
      })
    );

    // Calculate overall compliance score (weighted average)
    const validAssessments = assessments.filter(a => a.complianceScore > 0);
    const overallScore = validAssessments.length > 0
      ? validAssessments.reduce((sum, a) => sum + a.complianceScore, 0) / validAssessments.length
      : 0;

    return {
      accountId,
      overallComplianceScore: overallScore,
      frameworksAssessed: validAssessments.length,
      totalFrameworks: frameworks.length,
      frameworks: assessments.sort((a, b) => b.complianceScore - a.complianceScore),
      assessmentDate: new Date(),
    };
  }

  async getTopNonCompliantControls(accountId: string, limit: number = 10) {
    const frameworks = await this.prisma.complianceFramework.findMany();
    
    const allGaps = [];
    for (const framework of frameworks) {
      try {
        const gapAnalysis = await this.getComplianceGapAnalysis(framework.id, accountId);
        if (gapAnalysis && gapAnalysis.gaps) {
          gapAnalysis.gaps.forEach((gap: any) => {
            allGaps.push({
              ...gap,
              frameworkName: framework.name,
              frameworkId: framework.id,
            });
          });
        }
      } catch (error) {
        // Skip frameworks without data
        continue;
      }
    }

    // Sort by severity and number of affected resources
    return allGaps
      .sort((a, b) => {
        // First sort by severity
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aSeverity = severityOrder[a.severity] || 0;
        const bSeverity = severityOrder[b.severity] || 0;
        
        if (bSeverity !== aSeverity) {
          return bSeverity - aSeverity;
        }
        
        // Then by number of affected resources
        return b.totalResources - a.totalResources;
      })
      .slice(0, limit);
  }

  private async storeAssessmentResult(assessment: any) {
    // In a real implementation, we would store assessment results in database
    // For now, we'll just log it
    console.log(`Compliance assessment stored: ${assessment.frameworkId} - ${assessment.accountId}`);
    
    // Store in audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'COMPLIANCE_ASSESSMENT',
        entityType: 'COMPLIANCE',
        entityId: assessment.frameworkId,
        details: {
          frameworkId: assessment.frameworkId,
          accountId: assessment.accountId,
          score: assessment.complianceScore,
          timestamp: new Date(),
        },
        performedBy: 'system',
        performedAt: new Date(),
      },
    });
  }

  async seedPredefinedFrameworks() {
    const frameworkIds = getFrameworkIds();
    const results = [];

    for (const frameworkId of frameworkIds) {
      const frameworkDef = FRAMEWORKS[frameworkId];
      if (!frameworkDef) continue;

      try {
        // Create framework
        const framework = await this.prisma.complianceFramework.upsert({
          where: {
            name_version: {
              name: frameworkDef.framework.name,
              version: frameworkDef.framework.version,
            },
          },
          update: {
            description: frameworkDef.framework.description,
          },
          create: {
            name: frameworkDef.framework.name,
            version: frameworkDef.framework.version,
            description: frameworkDef.framework.description,
          },
        });

        // Create controls
        let controlCount = 0;
        for (const controlDef of frameworkDef.controls) {
          await this.prisma.complianceControl.upsert({
            where: {
              frameworkId_controlId: {
                frameworkId: framework.id,
                controlId: controlDef.controlId,
              },
            },
            update: {
              title: controlDef.title,
              description: controlDef.description,
              category: controlDef.category,
              severity: controlDef.severity,
              implementationGuidance: controlDef.implementationGuidance,
              auditGuidance: controlDef.auditGuidance,
              references: controlDef.references,
            },
            create: {
              frameworkId: framework.id,
              controlId: controlDef.controlId,
              title: controlDef.title,
              description: controlDef.description,
              category: controlDef.category,
              severity: controlDef.severity,
              implementationGuidance: controlDef.implementationGuidance,
              auditGuidance: controlDef.auditGuidance,
              references: controlDef.references,
            },
          });
          controlCount++;
        }

        // Create rule mappings
        let mappingCount = 0;
        for (const mappingDef of frameworkDef.mappings) {
          const control = await this.prisma.complianceControl.findFirst({
            where: {
              frameworkId: framework.id,
              controlId: mappingDef.controlId,
            },
          });

          if (control) {
            await this.prisma.ruleComplianceMapping.upsert({
              where: {
                ruleId_controlId: {
                  ruleId: mappingDef.ruleId,
                  controlId: control.id,
                },
              },
              update: {
                mappingType: mappingDef.mappingType,
                evidenceRequirements: mappingDef.evidenceRequirements,
              },
              create: {
                ruleId: mappingDef.ruleId,
                controlId: control.id,
                mappingType: mappingDef.mappingType,
                evidenceRequirements: mappingDef.evidenceRequirements,
              },
            });
            mappingCount++;
          }
        }

        results.push({
          framework: framework.name,
          version: framework.version,
          controls: controlCount,
          mappings: mappingCount,
          status: 'success',
        });
      } catch (error) {
        results.push({
          framework: frameworkDef.framework.name,
          version: frameworkDef.framework.version,
          error: error.message,
          status: 'failed',
        });
      }
    }

    return results;
  }
}
