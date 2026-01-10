import {
  IAMClient,
  ListUsersCommand,
  GetUserCommand,
  ListAccessKeysCommand,
  ListMFADevicesCommand,
  GetLoginProfileCommand,
  ListAttachedUserPoliciesCommand,
  ListUserPoliciesCommand,
  ListGroupsForUserCommand,
} from '@aws-sdk/client-iam';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ServiceCollector, CollectedAsset, AwsCredentials } from '../types';

export class IAMCollector implements ServiceCollector {
  private client: IAMClient;

  constructor(credentials: AwsCredentials) {
    this.client = new IAMClient({
      region: 'us-east-1', // IAM is global
      credentials: credentials.profile
        ? fromNodeProviderChain({ profile: credentials.profile })
        : credentials.accessKeyId
        ? {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
          }
        : fromNodeProviderChain(),
    });
  }

  async collectAssets(credentials: AwsCredentials, region: string): Promise<CollectedAsset[]> {
    const assets: CollectedAsset[] = [];
    
    try {
      const command = new ListUsersCommand({});
      const response = await this.client.send(command);
      
      if (response.Users) {
        for (const user of response.Users) {
          if (user.UserName) {
            assets.push({
              provider: 'aws',
              service: 'iam',
              region: 'global',
              resourceType: 'iam_user',
              resourceId: user.UserName,
              accountId: await this.getAccountId(credentials),
              arn: user.Arn,
              createdAt: user.CreateDate,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error collecting IAM users:', error);
    }
    
    return assets;
  }

  async collectConfig(asset: CollectedAsset, credentials: AwsCredentials): Promise<any> {
    const config: any = {
      resourceId: asset.resourceId,
      arn: asset.arn,
      region: asset.region,
    };

    try {
      const userName = asset.resourceId;
      
      const [
        userDetails,
        accessKeys,
        mfaDevices,
        loginProfile,
        attachedPolicies,
        inlinePolicies,
        groups,
      ] = await Promise.allSettled([
        this.getUserDetails(userName),
        this.getAccessKeys(userName),
        this.getMFADevices(userName),
        this.getLoginProfile(userName),
        this.getAttachedPolicies(userName),
        this.getInlinePolicies(userName),
        this.getGroupsForUser(userName),
      ]);

      config.userDetails = userDetails.status === 'fulfilled' ? userDetails.value : null;
      config.accessKeys = accessKeys.status === 'fulfilled' ? accessKeys.value : null;
      config.mfaDevices = mfaDevices.status === 'fulfilled' ? mfaDevices.value : null;
      config.loginProfile = loginProfile.status === 'fulfilled' ? loginProfile.value : null;
      config.attachedPolicies = attachedPolicies.status === 'fulfilled' ? attachedPolicies.value : null;
      config.inlinePolicies = inlinePolicies.status === 'fulfilled' ? inlinePolicies.value : null;
      config.groups = groups.status === 'fulfilled' ? groups.value : null;

    } catch (error) {
      console.error(`Error collecting config for IAM user ${asset.resourceId}:`, error);
    }

    return config;
  }

  private async getUserDetails(userName: string): Promise<any> {
    try {
      const command = new GetUserCommand({ UserName: userName });
      const response = await this.client.send(command);
      return response.User;
    } catch (error) {
      return null;
    }
  }

  private async getAccessKeys(userName: string): Promise<any> {
    try {
      const command = new ListAccessKeysCommand({ UserName: userName });
      const response = await this.client.send(command);
      return response.AccessKeyMetadata;
    } catch (error) {
      return null;
    }
  }

  private async getMFADevices(userName: string): Promise<any> {
    try {
      const command = new ListMFADevicesCommand({ UserName: userName });
      const response = await this.client.send(command);
      return response.MFADevices;
    } catch (error) {
      return null;
    }
  }

  private async getLoginProfile(userName: string): Promise<any> {
    try {
      const command = new GetLoginProfileCommand({ UserName: userName });
      const response = await this.client.send(command);
      return response.LoginProfile;
    } catch (error) {
      return null;
    }
  }

  private async getAttachedPolicies(userName: string): Promise<any> {
    try {
      const command = new ListAttachedUserPoliciesCommand({ UserName: userName });
      const response = await this.client.send(command);
      return response.AttachedPolicies;
    } catch (error) {
      return null;
    }
  }

  private async getInlinePolicies(userName: string): Promise<any> {
    try {
      const command = new ListUserPoliciesCommand({ UserName: userName });
      const response = await this.client.send(command);
      return response.PolicyNames;
    } catch (error) {
      return null;
    }
  }

  private async getGroupsForUser(userName: string): Promise<any> {
    try {
      const command = new ListGroupsForUserCommand({ UserName: userName });
      const response = await this.client.send(command);
      return response.Groups;
    } catch (error) {
      return null;
    }
  }

  private async getAccountId(credentials: AwsCredentials): Promise<string> {
    // In a real implementation, we would use STS to get account ID
    return '123456789012';
  }
}
