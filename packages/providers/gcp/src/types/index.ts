import { Asset, AssetConfig } from '@cspm/core-engine';

export interface GcpCredentials {
  projectId: string;
  keyFilename?: string;
  clientEmail?: string;
  privateKey?: string;
}

export interface GcpCollectorConfig {
  credentials: GcpCredentials;
  zones?: string[];
  services?: string[];
}

export interface CollectedAsset extends Asset {
  projectId: string;
  zone?: string;
  location?: string;
  service: string;
  type: string;
  name: string;
  id: string;
  arn?: string;
  properties?: any;
  labels?: Record<string, string>;
}

export interface GcpResource {
  id: string;
  name: string;
  type: string;
  location?: string;
  zone?: string;
  projectId: string;
  properties?: any;
  labels?: Record<string, string>;
}
