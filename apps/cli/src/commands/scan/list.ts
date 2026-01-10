import { Command, Flags } from '@oclif/core';
import { ApiClient } from '../../lib/api-client';
import ora from 'ora';

export default class ScanList extends Command {
  static description = 'List all scans';

  static examples = [
    '$ cspm scan:list',
    '$ cspm scan:list --account-id 123456789012',
  ];

  static flags = {
    'account-id': Flags.string({
      description: 'Filter by account ID',
    }),
    limit: Flags.integer({
      description: 'Number of scans to show',
      default: 10,
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output format',
      options: ['table', 'json', 'csv'],
      default: 'table',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ScanList);
    const apiClient = new ApiClient();
    const spinner = ora('Fetching scans...').start();

    try {
      const scans = await apiClient.get('/scans', {
        accountId: flags['account-id'],
      });

      spinner.succeed(`Found ${scans.length} scans`);

      if (flags.output === 'json') {
        console.log(JSON.stringify(scans, null, 2));
      } else if (flags.output === 'csv') {
        this.printCSV(scans);
      } else {
        this.printTable(scans);
      }
    } catch (error) {
      spinner.fail('Failed to fetch scans');
      this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private printTable(scans: any[]) {
    console.log('\nRecent Scans:');
    console.log('================================================================================');
    console.log('ID\t\tStatus\t\tStarted\t\t\tDuration\tFindings');
    console.log('================================================================================');

    for (const scan of scans.slice(0, 10)) {
      const id = scan.id.substring(0, 8) + '...';
      const status = scan.status.padEnd(10);
      const started = scan.startedAt 
        ? new Date(scan.startedAt).toISOString().split('T')[0]
        : '-'.padEnd(10);
      const duration = scan.startedAt && scan.completedAt
        ? `${Math.round((new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000)}s` 
        : '-'.padEnd(8);
      
      const findings = scan.summary
        ? `${scan.summary.passed || 0}✔ ${scan.summary.failed || 0}✘ ${scan.summary.warned || 0}⚠` 
        : '-';

      console.log(`${id}\t${status}\t${started}\t${duration}\t${findings}`);
    }
  }

  private printCSV(scans: any[]) {
    console.log('id,status,started_at,completed_at,duration,passed,failed,warned');
    
    for (const scan of scans) {
      const duration = scan.startedAt && scan.completedAt
        ? Math.round((new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000)
        : 0;

      console.log([
        scan.id,
        scan.status,
        scan.startedAt || '',
        scan.completedAt || '',
        duration,
        scan.summary?.passed || 0,
        scan.summary?.failed || 0,
        scan.summary?.warned || 0,
      ].join(','));
    }
  }
}
