import { Command, Flags } from '@oclif/core';
import { ApiClient } from '../../lib/api-client';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';

export default class ComplianceFrameworks extends Command {
  static description = 'List and manage compliance frameworks';

  static examples = [
    '$ cspm compliance:frameworks',
    '$ cspm compliance:frameworks --coverage',
    '$ cspm compliance:frameworks --seed',
  ];

  static flags = {
    coverage: Flags.boolean({
      description: 'Show coverage information',
      default: false,
    }),
    seed: Flags.boolean({
      description: 'Seed predefined frameworks',
      default: false,
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output format',
      options: ['table', 'json'],
      default: 'table',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ComplianceFrameworks);
    const apiClient = new ApiClient();
    const spinner = ora();

    try {
      if (flags.seed) {
        spinner.start('Seeding predefined compliance frameworks...');
        
        const result = await apiClient.post('/compliance/seed');
        
        spinner.succeed('Frameworks seeded successfully!');
        
        if (Array.isArray(result)) {
          const table = new Table({
            head: ['Framework', 'Version', 'Controls', 'Mappings', 'Status'],
            colWidths: [25, 10, 10, 10, 10],
          });

          result.forEach((framework: any) => {
            table.push([
              framework.framework,
              framework.version,
              framework.controls?.toString() || '0',
              framework.mappings?.toString() || '0',
              framework.status === 'success' ? chalk.green('✓') : chalk.red('✗'),
            ]);
          });

          this.log(table.toString());
        }
        return;
      }

      spinner.start('Loading compliance frameworks...');
      
      const frameworks = await apiClient.get('/compliance/frameworks');
      
      spinner.succeed('Frameworks loaded');

      if (flags.output === 'json') {
        this.log(JSON.stringify(frameworks, null, 2));
        return;
      }

      if (frameworks.length === 0) {
        this.log(chalk.yellow('No compliance frameworks found.'));
        this.log('Use --seed to add predefined frameworks.');
        return;
      }

      const table = new Table({
        head: flags.coverage 
          ? ['Framework', 'Version', 'Controls', 'Coverage', 'Status']
          : ['Framework', 'Version', 'Controls', 'Description'],
        colWidths: flags.coverage 
          ? [25, 10, 10, 12, 15]
          : [25, 10, 10, 40],
      });

      frameworks.forEach((framework: any) => {
        if (flags.coverage) {
          const coverage = framework.coverage || {};
          const coveragePercent = coverage.coveragePercentage || 0;
          const coverageLevel = coverage.coverageLevel || 'Unknown';
          
          let statusColor = chalk.red;
          if (coveragePercent >= 70) statusColor = chalk.green;
          else if (coveragePercent >= 50) statusColor = chalk.yellow;
          
          table.push([
            framework.name,
            framework.version,
            framework._count?.controls?.toString() || '0',
            `${coveragePercent.toFixed(1)}% (${coverageLevel})`,
            statusColor(coverageLevel),
          ]);
        } else {
          const description = framework.description || 'No description';
          const truncatedDesc = description.length > 37 ? description.substring(0, 37) + '...' : description;
          
          table.push([
            framework.name,
            framework.version,
            framework._count?.controls?.toString() || '0',
            truncatedDesc,
          ]);
        }
      });

      this.log(table.toString());

      if (flags.coverage) {
        this.log('\n' + chalk.blue('Coverage Levels:'));
        this.log('  ' + chalk.green('Excellent') + ': 90%+ rules mapped');
        this.log('  ' + chalk.green('Good') + ': 70-89% rules mapped');
        this.log('  ' + chalk.yellow('Fair') + ': 50-69% rules mapped');
        this.log('  ' + chalk.red('Poor') + ': <50% rules mapped');
      }

    } catch (error: any) {
      spinner.fail('Failed to load frameworks');
      this.error(chalk.red(error.message || 'Unknown error'));
    }
  }
}
