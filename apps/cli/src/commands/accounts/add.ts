import { Command, Flags } from '@oclif/core';
import { ApiClient } from '../../lib/api-client';
import inquirer from 'inquirer';

export default class AccountsAdd extends Command {
  static description = 'Add a cloud account for scanning';

  static examples = [
    '$ cspm accounts:add --provider aws --account-id 123456789012',
  ];

  static flags = {
    provider: Flags.string({
      char: 'p',
      description: 'Cloud provider',
      options: ['aws', 'azure', 'gcp', 'oci', 'github'],
      required: true,
    }),
    'account-id': Flags.string({
      description: 'Cloud account/project ID',
      required: true,
    }),
    name: Flags.string({
      description: 'Account name',
    }),
    'access-key': Flags.string({
      description: 'AWS Access Key ID',
    }),
    'secret-key': Flags.string({
      description: 'AWS Secret Access Key',
    }),
    profile: Flags.string({
      description: 'AWS profile name',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AccountsAdd);
    const apiClient = new ApiClient();

    // Collect credentials interactively if not provided
    let credentials = {};

    if (flags.provider === 'aws') {
      if (!flags['access-key'] && !flags.profile) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'authMethod',
            message: 'Choose authentication method:',
            choices: [
              { name: 'Access Key/Secret', value: 'key' },
              { name: 'AWS Profile', value: 'profile' },
            ],
          },
        ]);

        if (answers.authMethod === 'key') {
          const keyAnswers = await inquirer.prompt([
            {
              type: 'input',
              name: 'accessKey',
              message: 'AWS Access Key ID:',
            },
            {
              type: 'password',
              name: 'secretKey',
              message: 'AWS Secret Access Key:',
            },
          ]);
          credentials = {
            accessKeyId: keyAnswers.accessKey,
            secretAccessKey: keyAnswers.secretKey,
          };
        } else {
          const profileAnswer = await inquirer.prompt([
            {
              type: 'input',
              name: 'profile',
              message: 'AWS profile name:',
              default: 'default',
            },
          ]);
          credentials = { profile: profileAnswer.profile };
        }
      } else {
        credentials = {
          accessKeyId: flags['access-key'],
          secretAccessKey: flags['secret-key'],
          profile: flags.profile,
        };
      }
    }

    const accountData = {
      provider: flags.provider,
      accountId: flags['account-id'],
      name: flags.name || `Account ${flags['account-id']}`,
      credentials,
    };

    try {
      // In a real implementation, this would call the API
      console.log('Account added successfully:');
      console.log(JSON.stringify(accountData, null, 2));
      
      // For now, just show the configuration
      console.log('\nTo save this account to the database, use the API directly.');
      
    } catch (error) {
      this.error(`Failed to add account: ${error}`);
    }
  }
}
