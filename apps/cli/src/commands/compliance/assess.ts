import { Command, Flags } from '@oclif/core';
import { ApiClient } from '../../lib/api-client';
import ora from 'ora';
import chalk from 'chalk';

export default class ComplianceAssess extends Command {
  static description = 'Run compliance assessment against frameworks';

  static examples = [
    '$ cspm compliance:assess --framework cis-aws-1.5.0 --account-id 123456789012',
    '$ cspm compliance:assess --all-frameworks --account-id 123456789012',
  ];

  static flags = {
    framework: Flags.string({
      description: 'Compliance framework ID',
    }),
    'all-frameworks': Flags.boolean({
      description: 'Assess against all available frameworks',
      default: false,
    }),
    'account-id': Flags.string({
      description: 'Account ID to assess',
      required: true,
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output format',
      options: ['table', 'json', 'csv'],
      default: 'table',
    }),
    export: Flags.string({
      description: 'Export format (json, csv, pdf)',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ComplianceAssess);
    const apiClient = new ApiClient();
    const spinner = ora();

    try {
      if (flags['all-frameworks']) {
        // Assess all frameworks
        spinner.start('Assessing all compliance frameworks...');
        
        // Get all frameworks
        const frameworks = await apiClient.get('/compliance/frameworks');
        
        const assessments = [];
        for (const framework of frameworks) {
          spinner.text = `Assessing ${framework.name}...`;
          try {
            const assessment = await apiClient.get(
              `/compliance/assess/${framework.id}/${flags['account-id']}` 
            );
            assessments.push({
              framework: framework.name,
              version: framework.version,
              score: assessment.complianceScore,
              controls: assessment.totalControls,
              implemented: assessment.implementedControls,
            });
          } catch (error) {
            assessments.push({
              framework: framework.name,
              version: framework.version,
              error: error.message,
            });
          }
        }
        
        spinner.succeed('Completed all compliance assessments');
        
        if (flags.export) {
          await this.exportAssessment(assessments, flags.export);
        } else {
          this.printResults(assessments, flags.output);
        }
        
      } else if (flags.framework) {
        // Assess specific framework
        spinner.start(`Assessing ${flags.framework}...`);
        
        const assessment = await apiClient.get(
          `/compliance/assess/${flags.framework}/${flags['account-id']}` 
        );
        
        spinner.succeed(`Compliance assessment completed: ${assessment.complianceScore.toFixed(1)}%`);
        
        if (flags.export) {
          await this.exportAssessment([assessment], flags.export);
        } else {
          this.printAssessment(assessment, flags.output);
        }
        
      } else {
        this.error('Please specify either --framework or --all-frameworks');
      }
    } catch (error) {
      spinner.fail('Compliance assessment failed');
      this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private printResults(assessments: any[], format: string) {
    if (format === 'json') {
      console.log(JSON.stringify(assessments, null, 2));
      return;
    }

    if (format === 'csv') {
      console.log('Framework,Version,Score,Total Controls,Implemented Controls');
      assessments.forEach(assessment => {
        console.log([
          assessment.framework,
          assessment.version,
          assessment.score || 'N/A',
          assessment.controls || 'N/A',
          assessment.implemented || 'N/A',
        ].map(field => `"${field}"`).join(','));
      });
      return;
    }

    // Table format
    console.log('\n' + chalk.bold('📊 Compliance Assessment Results'));
    console.log('=' .repeat(80));

    assessments.forEach((assessment, idx) => {
      console.log(`\n${chalk.bold(`${idx + 1}.`)} ${assessment.framework} v${assessment.version}`);
      
      if (assessment.error) {
        console.log(`   ${chalk.red('Error:')} ${assessment.error}`);
      } else {
        const scoreColor = assessment.score >= 90 ? chalk.green :
                          assessment.score >= 70 ? chalk.yellow :
                          chalk.red;
        
        console.log(`   ${chalk.gray('Score:')} ${scoreColor(`${assessment.score}%`)}`);
        console.log(`   ${chalk.gray('Controls:')} ${assessment.implemented}/${assessment.controls} implemented`);
        console.log(`   ${chalk.gray('Status:')} ${
          assessment.score >= 90 ? 'Excellent' :
          assessment.score >= 70 ? 'Good' :
          assessment.score >= 50 ? 'Fair' :
          'Needs Improvement'
        }`);
      }
    });

    // Calculate average score
    const validScores = assessments.filter(a => a.score).map(a => a.score);
    if (validScores.length > 0) {
      const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
      console.log(`\n${chalk.bold('Overall Average Score:')} ${avgScore.toFixed(1)}%`);
    }
  }

  private printAssessment(assessment: any, format: string) {
    if (format === 'json') {
      console.log(JSON.stringify(assessment, null, 2));
      return;
    }

    if (format === 'csv') {
      console.log('Control ID,Status,Evidence');
      assessment.controls.forEach((control: any) => {
        console.log([
          control.controlId,
          control.status,
          control.evidence.join('; '),
        ].map(field => `"${field}"`).join(','));
      });
      return;
    }

    // Table format
    console.log('\n' + chalk.bold('📋 Compliance Assessment Details'));
    console.log('=' .repeat(80));
    
    console.log(`\n${chalk.gray('Framework:')} ${assessment.frameworkId}`);
    console.log(`${chalk.gray('Account:')} ${assessment.accountId}`);
    console.log(`${chalk.gray('Assessment Date:')} ${new Date(assessment.assessmentDate).toLocaleString()}`);
    console.log(`${chalk.gray('Compliance Score:')} ${chalk.bold(`${assessment.complianceScore.toFixed(1)}%`)}`);
    
    console.log(`\n${chalk.bold('Controls Summary:')}`);
    console.log(`  Total Controls: ${assessment.totalControls}`);
    console.log(`  Applicable: ${assessment.applicableControls}`);
    console.log(`  Implemented: ${assessment.implementedControls}`);
    console.log(`  Partially Implemented: ${assessment.partiallyImplementedControls}`);
    console.log(`  Not Implemented: ${assessment.notImplementedControls}`);
    console.log(`  Not Applicable: ${assessment.notApplicableControls}`);

    console.log(`\n${chalk.bold('Control Status:')}`);
    
    const statusCounts = assessment.controls.reduce((acc: any, control: any) => {
      acc[control.status] = (acc[control.status] || 0) + 1;
      return acc;
    }, {});

    Object.entries(statusCounts).forEach(([status, count]) => {
      const statusColor = status === 'implemented' ? chalk.green :
                         status === 'partially_implemented' ? chalk.yellow :
                         status === 'not_implemented' ? chalk.red :
                         chalk.gray;
      
      console.log(`  ${statusColor(status)}: ${count}`);
    });

    // Show top non-compliant controls
    const nonCompliant = assessment.controls.filter((c: any) => 
      c.status === 'not_implemented' || c.status === 'partially_implemented'
    ).slice(0, 5);

    if (nonCompliant.length > 0) {
      console.log(`\n${chalk.bold('Top Non-Compliant Controls:')}`);
      nonCompliant.forEach((control: any, idx: number) => {
        console.log(`\n${idx + 1}. ${control.controlId}`);
        console.log(`   Status: ${control.status}`);
        if (control.comments) {
          console.log(`   Comments: ${control.comments}`);
        }
      });
    }
  }

  private async exportAssessment(assessments: any[], format: string) {
    const apiClient = new ApiClient();
    const spinner = ora(`Exporting assessment as ${format}...`).start();

    try {
      // For single assessment, export full report
      if (assessments.length === 1 && assessments[0].frameworkId) {
        const assessment = assessments[0];
        const report = await apiClient.get(
          `/compliance/export/${assessment.frameworkId}/${assessment.accountId}`,
          { format }
        );

        // Save to file
        const fs = require('fs');
        const filename = `compliance-report-${assessment.frameworkId}-${Date.now()}.${format}`;
        fs.writeFileSync(filename, report);
        
        spinner.succeed(`Report exported to ${filename}`);
      } else {
        spinner.warn('Export format not supported for multiple assessments');
        this.printResults(assessments, format);
      }
    } catch (error) {
      spinner.fail('Export failed');
      this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
