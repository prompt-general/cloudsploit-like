import { Asset, AssetConfig } from '@cspm/core-engine';
import { AwsCredentials, AwsCollectorConfig, CollectedAsset } from './types';
import { S3Collector } from './services/s3-collector';
import { IAMCollector } from './services/iam-collector';

export class AwsAdapter {
  private credentials: AwsCredentials;
  private regions: string[];
  private services: Set<string>;

  constructor(config: AwsCollectorConfig) {
    this.credentials = config.credentials;
    this.regions = config.regions || ['us-east-1'];
    this.services = new Set(config.services || ['s3', 'iam']);
  }

  async collectAssets(): Promise<CollectedAsset[]> {
    const allAssets: CollectedAsset[] = [];

    for (const region of this.regions) {
      for (const service of this.services) {
        try {
          const collector = this.getServiceCollector(service, region);
          const assets = await collector.collectAssets(this.credentials, region);
          allAssets.push(...assets);
        } catch (error) {
          console.error(`Error collecting assets for ${service} in ${region}:`, error);
        }
      }
    }

    return allAssets;
  }

  async collectConfig(asset: CollectedAsset): Promise<AssetConfig> {
    const collector = this.getServiceCollector(asset.service, asset.region);
    const rawConfig = await collector.collectConfig(asset, this.credentials);
    
    return {
      assetId: asset.id!,
      rawConfig,
      configHash: '', // Will be computed by core engine
      collectedAt: new Date(),
      metadata: {
        region: asset.region,
        arn: asset.arn,
      },
    };
  }

  getMetadata(): { provider: string; version: string } {
    return {
      provider: 'aws',
      version: '1.0.0',
    };
  }

  private getServiceCollector(service: string, region: string) {
    switch (service) {
      case 's3':
        return new S3Collector(this.credentials, region);
      case 'iam':
        return new IAMCollector(this.credentials);
      default:
        throw new Error(`Unsupported service: ${service}`);
    }
  }
}

export { AwsCredentials, AwsCollectorConfig };
export default AwsAdapter;
