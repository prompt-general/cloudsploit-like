import { Rule } from '@cspm/core-engine';
import { gcpStorageEncryptionRule } from './storage/encryption';
import { gcpStoragePublicAccessRule } from './storage/public-access';

export const gcpRules: Rule[] = [
  gcpStorageEncryptionRule,
  gcpStoragePublicAccessRule,
];
