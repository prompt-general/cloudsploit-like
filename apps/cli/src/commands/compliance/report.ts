import { Command, Flags } from '@oclif/core';
import { ApiClient } from '../../lib/api-client';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export default class ComplianceReport extends Command {
  static description = 'Generate and export compliance reports';

  static examples = [
    '$ cspm compliance:report --framework cis-aws-1.5.0 --account-id 123456789012',
    '$ cspm compliance:report --framework cis-aws-1.5.0 --account-id 123456789012 --format csv --output report.csv',
    '$ cspm compliance:report --framework cis-aws-1.5.0 --account-id 123456789012 --format pdf',
  ];

  static flags = {
    framework: Flags.string({
      description: 'Compliance framework ID',
      required: true,
    }),
    'account-id': Flags.string({
      description: 'Account ID to generate report for',
      required: true,
    }),
    format: Flags.string({
      description: 'Export format',
      options: ['json', 'csv', 'pdf'],
      default: 'json',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output file path (optional, prints to stdout if not provided)',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ComplianceReport);
    const apiClient = new ApiClient();
    const spinner = ora();

    try {
      spinner.start(`Generating ${flags.format.toUpperCase()} compliance report...`);
      
      const response = await apiClient.get(
        `/compliance/export/${flags.framework}/${flags['account-id']}?format=${flags.format}`,
        {
          responseType: flags.format === 'pdf' ? 'arraybuffer' : 'json',
        }
      );
      
      spinner.succeed('Report generated successfully!');

      if (flags.output) {
        // Save to file
        const outputPath = path.resolve(flags.output);
        fs.writeFileSync(outputPath, response);
        this.log(chalk.green(`Report saved to: ${outputPath}`));
      } else {
        // Print to stdout
        if (flags.format === 'json') {
          this.log(JSON.stringify(response, null, 2));
        } else if (flags.format === 'csv') {
          this.log(response);
        } else if (flags.format === 'pdf') {
          this.log(chalk.yellow('PDF format requires --output flag to save to file'));
        }
      }

    } catch (error: any) {
      spinner.fail('Failed to generate report');
      this.error(chalk.red(error.message || 'Unknown error'));
    }
  }
}
