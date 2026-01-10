import { Asset, Provider } from '@cspm/core-engine';

export interface AwsCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  profile?: string;
  roleArn?: string;
  region?: string;
}

export interface AwsCollectorConfig {
  credentials: AwsCredentials;
  regions?: string[];
  services?: string[];
}

export interface CollectedAsset extends Asset {
  arn?: string;
  tags?: Record<string, string>;
}

export interface ServiceCollector {
  collectAssets(credentials: AwsCredentials, region: string): Promise<CollectedAsset[]>;
  collectConfig(asset: CollectedAsset, credentials: AwsCredentials): Promise<any>;
}
