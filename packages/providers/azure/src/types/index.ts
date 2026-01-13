import { Asset, AssetConfig } from '@cspm/core-engine';

export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

export interface AzureCollectorConfig {
  credentials: AzureCredentials;
  resourceGroups?: string[];
  services?: string[];
}

export interface CollectedAsset extends Asset {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  service: string;
  type: string;
  name: string;
  id: string;
  arn?: string;
  properties?: any;
  tags?: Record<string, string>;
}

export interface AzureResource {
  id: string;
  name: string;
  type: string;
  location: string;
  resourceGroup: string;
  subscriptionId: string;
  properties?: any;
  tags?: Record<string, string>;
}
