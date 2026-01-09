import { z } from 'zod';

export const Provider = z.enum(['aws', 'azure', 'gcp', 'oci', 'github']);
export type Provider = z.infer<typeof Provider>;

export const AssetSchema = z.object({
  id: z.string().optional(),
  accountId: z.string(),
  provider: Provider,
  service: z.string(),
  region: z.string().optional(),
  resourceType: z.string(),
  resourceId: z.string(),
  config: z.record(z.any()).optional(),
});

export type Asset = z.infer<typeof AssetSchema>;

export const AssetConfigSchema = z.object({
  id: z.string().optional(),
  assetId: z.string(),
  collectedAt: z.date().default(() => new Date()),
  configHash: z.string(),
  rawConfig: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
});

export type AssetConfig = z.infer<typeof AssetConfigSchema>;
