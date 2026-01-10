import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('frameworks')
  async getFrameworks() {
    return this.complianceService.getFrameworks();
  }

  @Get('frameworks/:id')
  async getFrameworkDetails(@Param('id') id: string) {
    return this.complianceService.getFrameworkDetails(id);
  }

  @Get('frameworks/:id/coverage')
  async getFrameworkCoverage(@Param('id') id: string) {
    return this.complianceService.getFrameworkCoverage(id);
  }

  @Get('assess/:frameworkId/:accountId')
  async assessCompliance(
    @Param('frameworkId') frameworkId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.complianceService.assessCompliance(frameworkId, accountId);
  }

  @Get('trend/:frameworkId/:accountId')
  async getComplianceTrend(
    @Param('frameworkId') frameworkId: string,
    @Param('accountId') accountId: string,
    @Query('days') days?: string,
  ) {
    return this.complianceService.getComplianceTrend(
      frameworkId,
      accountId,
      days ? parseInt(days) : 30,
    );
  }

  @Get('gap-analysis/:frameworkId/:accountId')
  async getComplianceGapAnalysis(
    @Param('frameworkId') frameworkId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.complianceService.getComplianceGapAnalysis(frameworkId, accountId);
  }

  @Get('controls/:id')
  async getControlDetails(@Param('id') id: string) {
    return this.complianceService.getControlDetails(id);
  }

  @Get('accounts/:accountId/summary')
  async getAccountComplianceSummary(@Param('accountId') accountId: string) {
    return this.complianceService.getAccountComplianceSummary(accountId);
  }

  @Get('accounts/:accountId/top-non-compliant')
  async getTopNonCompliantControls(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: string,
  ) {
    return this.complianceService.getTopNonCompliantControls(
      accountId,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('compare')
  async compareFrameworks(
    @Query('frameworkIds') frameworkIds: string,
    @Query('accountId') accountId: string,
  ) {
    const ids = frameworkIds.split(',');
    return this.complianceService.compareFrameworks(ids, accountId);
  }

  @Get('export/:frameworkId/:accountId')
  async exportComplianceReport(
    @Param('frameworkId') frameworkId: string,
    @Param('accountId') accountId: string,
    @Query('format') format: 'json' | 'csv' | 'pdf' = 'json',
    @Res() res: Response,
  ) {
    const report = await this.complianceService.exportComplianceReport(
      frameworkId,
      accountId,
      format,
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${frameworkId}-${accountId}.csv"`);
      return res.send(report);
    } else if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${frameworkId}-${accountId}.pdf"`);
      // In real implementation, generate PDF
      return res.json({ message: 'PDF export not implemented' });
    }

    return res.json(report);
  }

  @Post('seed')
  async seedFrameworks() {
    return this.complianceService.seedPredefinedFrameworks();
  }

  @Get('dashboard')
  async getComplianceDashboard(@Query('accountId') accountId?: string) {
    // Get overall statistics
    const frameworks = await this.complianceService.getFrameworks();
    
    let accountSummary = null;
    if (accountId) {
      accountSummary = await this.complianceService.getAccountComplianceSummary(accountId);
    }

    // Get recent assessments
    const recentAssessments = await this.getRecentAssessments();

    return {
      frameworks: frameworks.length,
      controls: frameworks.reduce((sum, f) => sum + (f._count?.controls || 0), 0),
      accountSummary,
      recentAssessments,
      predefinedFrameworks: Object.keys(FRAMEWORKS || {}).length,
    };
  }

  private async getRecentAssessments() {
    // Get recent scans and their compliance assessments
    const recentScans = await this.prisma.scan.findMany({
      where: { status: 'completed' },
      take: 5,
      orderBy: { completedAt: 'desc' },
      include: {
        account: true,
      },
    });

    return recentScans.map(scan => ({
      scanId: scan.id,
      accountId: scan.accountId,
      accountName: scan.account.name,
      completedAt: scan.completedAt,
      findings: scan.summary,
    }));
  }
}
