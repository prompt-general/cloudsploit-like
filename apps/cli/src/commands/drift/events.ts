import { Command, Flags } from '@oclif/core';
import { ApiClient } from '../../lib/api-client';
import ora from 'ora';
import chalk from 'chalk';

export default class DriftEvents extends Command {
  static description = 'List drift events';

  static examples = [
    '$ cspm drift:events',
    '$ cspm drift:events --asset-id abc123 --limit 50',
  ];

  static flags = {
    'asset-id': Flags.string({
      description: 'Filter by asset ID',
    }),
    'change-type': Flags.string({
      description: 'Filter by change type',
    }),
    'start-date': Flags.string({
      description: 'Start date (YYYY-MM-DD)',
    }),
    'end-date': Flags.string({
      description: 'End date (YYYY-MM-DD)',
    }),
    limit: Flags.integer({
      description: 'Number of events to show',
      default: 20,
    }),
    offset: Flags.integer({
      description: 'Offset for pagination',
      default: 0,
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output format',
      options: ['table', 'json', 'csv'],
      default: 'table',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(DriftEvents);
    const apiClient = new ApiClient();
    const spinner = ora('Fetching drift events...').start();

    try {
      const params: any = {};
      if (flags['asset-id']) params.assetId = flags['asset-id'];
      if (flags['change-type']) params.changeType = flags['change-type'];
      if (flags['start-date']) params.startDate = flags['start-date'];
      if (flags['end-date']) params.endDate = flags['end-date'];
      if (flags.limit) params.limit = flags.limit;
      if (flags.offset) params.offset = flags.offset;

      const events = await apiClient.get('/drift', params);

      spinner.succeed(`Found ${events.total} drift events`);

      if (flags.output === 'json') {
        console.log(JSON.stringify(events, null, 2));
      } else if (flags.output === 'csv') {
        this.printCSV(events.drifts);
      } else {
        this.printTable(events.drifts, events.total);
      }
    } catch (error) {
      spinner.fail('Failed to fetch drift events');
      this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private printTable(events: any[], total: number) {
    console.log('\n' + chalk.bold('📈 Drift Events'));
    console.log('='.repeat(100));
    
    if (events.length === 0) {
      console.log(chalk.yellow('No drift events found'));
      return;
    }

    console.log(`Showing ${events.length} of ${total} events\n`);
    
    events.forEach((event, idx) => {
      const severityColor = this.getSeverityColor(event.analysis?.severity || 'low');
      const requiresAttention = event.requiresAttention ? chalk.red('⚠ ') : '  ';
      
      console.log(`${chalk.bold(`${idx + 1}.`)} ${requiresAttention}${event.asset?.resourceId || 'Unknown'}`);
      console.log(`   ${chalk.gray('Type:')} ${event.changeType}`);
      console.log(`   ${chalk.gray('Severity:')} ${chalk[severityColor](event.analysis?.severity || 'low')}`);
      console.log(`   ${chalk.gray('Detected:')} ${new Date(event.detectedAt).toLocaleString()}`);
      console.log(`   ${chalk.gray('Impact:')} ${event.analysis?.impact || 'Unknown'}`);
      
      if (event.asset) {
        console.log(`   ${chalk.gray('Asset:')} ${event.asset.service} / ${event.asset.region}`);
      }
      
      console.log();
    });
  }

  private printCSV(events: any[]) {
    console.log('detected_at,asset_id,resource_id,service,region,change_type,severity,impact');
    
    events.forEach(event => {
      const row = [
        event.detectedAt,
        event.assetId,
        event.asset?.resourceId || '',
        event.asset?.service || '',
        event.asset?.region || '',
        event.changeType,
        event.analysis?.severity || '',
        event.analysis?.impact?.replace(/,/g, ';') || '',
      ].map(field => `"${field}"`).join(',');
      
      console.log(row);
    });
  }

  private getSeverityColor(severity: string): keyof typeof chalk {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'white';
    }
  }
}
