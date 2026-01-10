import { Command, Flags } from '@oclif/core';
import { ApiClient } from '../../lib/api-client';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';

export default class DriftBaseline extends Command {
  static description = 'Manage configuration baselines';

  static examples = [
    '$ cspm drift:baseline --asset-id abc123',
    '$ cspm drift:baseline --set --asset-id abc123 --config-id def456',
  ];

  static flags = {
    set: Flags.boolean({
      description: 'Set a new baseline',
      default: false,
    }),
    'asset-id': Flags.string({
      description: 'Asset ID',
    }),
    'config-id': Flags.string({
      description: 'Configuration ID (for setting baseline)',
    }),
    'approved-by': Flags.string({
      description: 'Who approved the baseline',
      default: 'cli-user',
    }),
    comment: Flags.string({
      description: 'Comment for the baseline',
    }),
    tags: Flags.string({
      description: 'Comma-separated tags',
    }),
    list: Flags.boolean({
      description: 'List baselines for asset',
      default: false,
    }),
    revert: Flags.string({
      description: 'Revert to specific baseline ID',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(DriftBaseline);
    const apiClient = new ApiClient();
    const spinner = ora();

    try {
      if (flags.revert) {
        // Revert to baseline
        spinner.start('Reverting to baseline...');
        const result = await apiClient.post(`/drift/revert/${flags['asset-id']}/${flags.revert}`);
        spinner.succeed('Revert instructions generated');
        console.log('\n' + chalk.bold('Revert Instructions:'));
        console.log(JSON.stringify(result, null, 2));
        
      } else if (flags.set) {
        // Set new baseline
        if (!flags['asset-id']) {
          this.error('Asset ID is required when setting baseline');
        }

        let configId = flags['config-id'];
        if (!configId) {
          // Get latest config for asset
          spinner.start('Fetching latest configuration...');
          const assetStatus = await apiClient.get(`/drift/asset/${flags['asset-id']}`);
          if (!assetStatus.latestConfig) {
            spinner.fail('No configuration found for asset');
            return;
          }
          configId = assetStatus.latestConfig.id;
          spinner.succeed(`Using latest configuration: ${configId.slice(0, 8)}...`);
        }

        const baselineData: any = {
          assetId: flags['asset-id'],
          configId,
          approvedBy: flags['approved-by'],
        };

        if (flags.comment) baselineData.comment = flags.comment;
        if (flags.tags) baselineData.tags = flags.tags.split(',').map((t: string) => t.trim());

        spinner.start('Setting baseline...');
        const baseline = await apiClient.post('/drift/baseline', baselineData);
        spinner.succeed(`Baseline set: ${baseline.id}`);
        console.log('\n' + chalk.green('✓ Baseline created successfully'));
        console.log(`ID: ${baseline.id}`);
        console.log(`Asset: ${baseline.assetId}`);
        console.log(`Approved by: ${baseline.approvedBy}`);
        console.log(`At: ${new Date(baseline.approvedAt).toLocaleString()}`);
        
      } else if (flags.list || flags['asset-id']) {
        // List baselines
        spinner.start('Fetching baselines...');
        const baselines = await apiClient.get(`/drift/baseline/${flags['asset-id']}`);
        spinner.succeed(`Found ${baselines.length} baselines`);
        
        this.printBaselines(baselines);
        
      } else {
        this.error('Please specify an action: --set, --list, or --revert');
      }
    } catch (error) {
      spinner.fail('Operation failed');
      this.error(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private printBaselines(baselines: any[]) {
    if (baselines.length === 0) {
      console.log(chalk.yellow('No baselines found'));
      return;
    }

    console.log('\n' + chalk.bold('📋 Configuration Baselines'));
    console.log('='.repeat(80));

    baselines.forEach((baseline, idx) => {
      const isCurrent = baseline.isCurrent ? chalk.green('(Current)') : chalk.gray('(Historical)');
      
      console.log(`\n${chalk.bold(`${idx + 1}.`)} ${baseline.id.slice(0, 8)}... ${isCurrent}`);
      console.log(`   ${chalk.gray('Asset:')} ${baseline.assetId}`);
      console.log(`   ${chalk.gray('Config:')} ${baseline.configId.slice(0, 8)}...`);
      console.log(`   ${chalk.gray('Approved by:')} ${baseline.approvedBy}`);
      console.log(`   ${chalk.gray('At:')} ${new Date(baseline.approvedAt).toLocaleString()}`);
      
      if (baseline.comment) {
        console.log(`   ${chalk.gray('Comment:')} ${baseline.comment}`);
      }

      // Show config hash
      if (baseline.config?.configHash) {
        console.log(`   ${chalk.gray('Config Hash:')} ${baseline.config.configHash.slice(0, 16)}...`);
      }
    });

    console.log('\n' + chalk.dim('Use --revert <baseline-id> to revert to a specific baseline'));
  }
}
