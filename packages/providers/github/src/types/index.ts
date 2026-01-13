import { Asset, AssetConfig } from '@cspm/core-engine';

export interface GitHubCredentials {
  token: string;
  apiUrl?: string;
}

export interface GitHubCollectorConfig {
  credentials: GitHubCredentials;
  organizations?: string[];
  repositories?: string[];
  services?: string[];
}

export interface CollectedAsset extends Asset {
  organization: string;
  repository: string;
  service: string;
  type: string;
  name: string;
  id: string;
  arn?: string;
  properties?: any;
  tags?: Record<string, string>;
}

export interface GitHubResource {
  id: string;
  name: string;
  type: string;
  organization: string;
  repository: string;
  properties?: any;
  tags?: Record<string, string>;
}
