import { Command, Flags } from '@oclif/core';
import { ApiClient } from '../../lib/api-client';

export default class AuthLogin extends Command {
  static description = 'Authenticate with the CSPM API';

  static examples = [
    '$ cspm auth:login --api-url http://localhost:3001 --token my-token',
  ];

  static flags = {
    'api-url': Flags.string({
      description: 'API URL',
      default: 'http://localhost:3001/api/v1',
    }),
    token: Flags.string({
      description: 'Authentication token',
    }),
    profile: Flags.string({
      description: 'Profile name to save configuration',
      default: 'default',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthLogin);
    const apiClient = new ApiClient(flags['api-url'], flags.token);

    try {
      // Test connection
      await apiClient.get('/scans/dashboard/stats');
      
      // Save configuration
      const config = {
        apiUrl: flags['api-url'],
        token: flags.token,
        profile: flags.profile,
      };

      // In a real implementation, save to config file
      console.log(`Successfully authenticated as profile: ${flags.profile}`);
      console.log(`API URL: ${flags['api-url']}`);
      
    } catch (error) {
      this.error(`Authentication failed: ${error}`);
    }
  }
}
