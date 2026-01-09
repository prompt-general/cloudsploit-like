import { Command, Flags } from '@oclif/core';
import { ApiClient } from '../../lib/api-client';
import ora from 'ora';

export default class ScanRun extends Command {
  static description = 'Run a security scan on cloud resources';

  static examples = [
    '$ cspm scan:run --provider aws',
    '$ cspm scan:run --provider aws --account-id 123456789012',
  ];

  static flags = {
    provider: Flags.string({
      char: 'p',
      description: 'Cloud provider to scan',
      options: ['aws', 'azure', 'gcp', 'oci', 'github'],
      required: true,
    }),
    'account-id': Flags.string({
      description: 'Specific account/project ID to scan',
    }),
    region: Flags.string({
      description: 'Specific region to scan (AWS/Azure/GCP/OCI)',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output format',
      options: ['json', 'table'],
      default: 'table',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ScanRun);
    const apiClient = new ApiClient();

    const spinner = ora('Starting scan...').start();

    try {
      const scan = await apiClient.post('/scans', {
        provider: flags.provider,
        accountId: flags['account-id'],
        region: flags.region,
      });

      spinner.text = `Scan started: ${scan.id}`;

      // Poll for completion
      let isComplete = false;
      while (!isComplete) {
        const status = await apiClient.get(`/scans/${scan.id}/status`);
        
        if (status.completedAt) {
          isComplete = true;
          spinner.succeed(`Scan completed: ${scan.id}`);
          
          const results = await apiClient.get(`/scans/${scan.id}/findings`);
          
          if (flags.output === 'json') {
            console.log(JSON.stringify(results, null, 2));
          } else {
            this.printTable(results);
          }
        } else {
          spinner.text = `Scan in progress... (${status.progress || 0}%)`;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      spinner.fail('Scan failed');
      this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private printTable(results: any) {
    // Simple table output for now
    console.log('\nScan Results:');
    console.log('=============');
    if (results.findings) {
      const passed = results.findings.filter((f: any) => f.status === 'pass').length;
      const failed = results.findings.filter((f: any) => f.status === 'fail').length;
      const warned = results.findings.filter((f: any) => f.status === 'warn').length;
      
      console.log(`Passed: ${passed}`);
      console.log(`Failed: ${failed}`);
      console.log(`Warnings: ${warned}`);
      console.log(`Total: ${results.findings.length}`);
    }
  }
}
