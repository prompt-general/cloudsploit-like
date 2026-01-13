import { Rule } from '@cspm/core-engine';
import { ociStorageEncryptionRule } from './storage/encryption';
import { ociStoragePublicAccessRule } from './storage/public-access';

export const ociRules: Rule[] = [
  ociStorageEncryptionRule,
  ociStoragePublicAccessRule,
];
