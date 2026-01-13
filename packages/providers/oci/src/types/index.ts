import { Asset, AssetConfig } from '@cspm/core-engine';

export interface OciCredentials {
  tenancyOcid: string;
  userOcid: string;
  fingerprint: string;
  privateKey: string;
  region: string;
  compartmentId?: string;
}

export interface OciCollectorConfig {
  credentials: OciCredentials;
  compartments?: string[];
  services?: string[];
}

export interface CollectedAsset extends Asset {
  tenancyOcid: string;
  compartmentId: string;
  region: string;
  service: string;
  type: string;
  name: string;
  id: string;
  arn?: string;
  properties?: any;
  tags?: Record<string, string>;
}

export interface OciResource {
  id: string;
  name: string;
  type: string;
  region: string;
  compartmentId: string;
  tenancyOcid: string;
  properties?: any;
  tags?: Record<string, string>;
}
