import { Command, Flags } from '@oclif/core';
import { ApiClient } from '../../lib/api-client';
import ora from 'ora';
import chalk from 'chalk';

export default class DriftSummary extends Command {
  static description = 'Get drift detection summary';

  static examples = [
    '$ cspm drift:summary',
    '$ cspm drift:summary --hours 48',
  ];

  static flags = {
    hours: Flags.integer({
      description: 'Time range in hours',
      default: 24,
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output format',
      options: ['table', 'json', 'yaml'],
      default: 'table',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(DriftSummary);
    const apiClient = new ApiClient();
    const spinner = ora('Fetching drift summary...').start();

    try {
      const summary = await apiClient.get('/drift/summary', {
        hours: flags.hours,
      });

      spinner.succeed(`Drift summary for last ${flags.hours}h`);

      if (flags.output === 'json') {
        console.log(JSON.stringify(summary, null, 2));
      } else if (flags.output === 'yaml') {
        // Simple YAML output
        console.log(this.toYAML(summary));
      } else {
        this.printTable(summary);
      }
    } catch (error) {
      spinner.fail('Failed to fetch drift summary');
      this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private printTable(summary: any) {
    const stats = summary.statistics;
    
    console.log('\n' + chalk.bold('📊 Drift Detection Summary'));
    console.log('='.repeat(50));
    
    console.log(`\n${chalk.bold('Overall Statistics:')}`);
    console.log(`Total Drifts: ${chalk.bold(stats.totalDrifts)}`);
    console.log(`Time Range: ${stats.timeRange}`);
    
    console.log(`\n${chalk.bold('By Severity:')}`);
    if (stats.bySeverity) {
      Object.entries(stats.bySeverity).forEach(([severity, count]) => {
        const color = this.getSeverityColor(severity);
        console.log(`  ${chalk[color](severity)}: ${count}`);
      });
    }
    
    console.log(`\n${chalk.bold('By Change Type:')}`);
    if (stats.byType) {
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
    
    console.log(`\n${chalk.bold('Recent Drifts:')}`);
    summary.recentDrifts?.slice(0, 5).forEach((drift: any, idx: number) => {
      console.log(`\n${idx + 1}. ${drift.asset?.resourceId}`);
      console.log(`   Type: ${drift.changeType}`);
      console.log(`   Time: ${new Date(drift.detectedAt).toLocaleString()}`);
    });
    
    console.log(`\n${chalk.bold('Top Drifting Assets:')}`);
    summary.topDriftingAssets?.slice(0, 5).forEach((asset: any, idx: number) => {
      console.log(`\n${idx + 1}. ${asset.asset?.resourceId}`);
      console.log(`   Drift Count: ${asset.driftCount}`);
      console.log(`   Service: ${asset.asset?.service}`);
    });
  }

  private toYAML(obj: any, indent: number = 0): string {
    let yaml = '';
    const spaces = ' '.repeat(indent);
    
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        yaml += `${spaces}- ${this.toYAML(item, indent + 2)}\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          yaml += `${spaces}${key}:\n${this.toYAML(value, indent + 2)}`;
        } else if (Array.isArray(value)) {
          yaml += `${spaces}${key}:\n${this.toYAML(value, indent + 2)}`;
        } else {
          yaml += `${spaces}${key}: ${this.formatYAMLValue(value)}\n`;
        }
      });
    } else {
      yaml += `${spaces}${this.formatYAMLValue(obj)}\n`;
    }
    
    return yaml;
  }

  private formatYAMLValue(value: any): string {
    if (typeof value === 'string') {
      if (value.includes('\n') || value.includes(':')) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (value === null) {
      return 'null';
    }
    return String(value);
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
