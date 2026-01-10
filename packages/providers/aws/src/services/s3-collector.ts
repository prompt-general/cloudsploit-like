import {
  S3Client,
  ListBucketsCommand,
  GetBucketPolicyCommand,
  GetBucketAclCommand,
  GetPublicAccessBlockCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetBucketLoggingCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ServiceCollector, CollectedAsset, AwsCredentials } from '../types';

export class S3Collector implements ServiceCollector {
  private client: S3Client;

  constructor(credentials: AwsCredentials, region: string = 'us-east-1') {
    this.client = new S3Client({
      region,
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
      const command = new ListBucketsCommand({});
      const response = await this.client.send(command);
      
      if (response.Buckets) {
        for (const bucket of response.Buckets) {
          if (bucket.Name) {
            assets.push({
              provider: 'aws',
              service: 's3',
              region: region,
              resourceType: 's3_bucket',
              resourceId: bucket.Name,
              accountId: await this.getAccountId(credentials),
              arn: `arn:aws:s3:::${bucket.Name}`,
              createdAt: bucket.CreationDate,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error collecting S3 buckets:', error);
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
      // Collect multiple configurations in parallel
      const [
        acl,
        policy,
        publicAccessBlock,
        encryption,
        versioning,
        logging,
      ] = await Promise.allSettled([
        this.getBucketAcl(asset.resourceId),
        this.getBucketPolicy(asset.resourceId),
        this.getPublicAccessBlock(asset.resourceId),
        this.getBucketEncryption(asset.resourceId),
        this.getBucketVersioning(asset.resourceId),
        this.getBucketLogging(asset.resourceId),
      ]);

      config.acl = acl.status === 'fulfilled' ? acl.value : null;
      config.policy = policy.status === 'fulfilled' ? policy.value : null;
      config.publicAccessBlock = publicAccessBlock.status === 'fulfilled' ? publicAccessBlock.value : null;
      config.encryption = encryption.status === 'fulfilled' ? encryption.value : null;
      config.versioning = versioning.status === 'fulfilled' ? versioning.value : null;
      config.logging = logging.status === 'fulfilled' ? logging.value : null;

    } catch (error) {
      console.error(`Error collecting config for S3 bucket ${asset.resourceId}:`, error);
    }

    return config;
  }

  private async getBucketAcl(bucketName: string): Promise<any> {
    try {
      const command = new GetBucketAclCommand({ Bucket: bucketName });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      return null;
    }
  }

  private async getBucketPolicy(bucketName: string): Promise<any> {
    try {
      const command = new GetBucketPolicyCommand({ Bucket: bucketName });
      const response = await this.client.send(command);
      return response.Policy ? JSON.parse(response.Policy) : null;
    } catch (error) {
      return null;
    }
  }

  private async getPublicAccessBlock(bucketName: string): Promise<any> {
    try {
      const command = new GetPublicAccessBlockCommand({ Bucket: bucketName });
      const response = await this.client.send(command);
      return response.PublicAccessBlockConfiguration;
    } catch (error) {
      return null;
    }
  }

  private async getBucketEncryption(bucketName: string): Promise<any> {
    try {
      const command = new GetBucketEncryptionCommand({ Bucket: bucketName });
      const response = await this.client.send(command);
      return response.ServerSideEncryptionConfiguration;
    } catch (error) {
      return null;
    }
  }

  private async getBucketVersioning(bucketName: string): Promise<any> {
    try {
      const command = new GetBucketVersioningCommand({ Bucket: bucketName });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      return null;
    }
  }

  private async getBucketLogging(bucketName: string): Promise<any> {
    try {
      const command = new GetBucketLoggingCommand({ Bucket: bucketName });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      return null;
    }
  }

  private async getAccountId(credentials: AwsCredentials): Promise<string> {
    // In a real implementation, we would use STS to get account ID
    // For now, return a placeholder
    return '123456789012';
  }
}
