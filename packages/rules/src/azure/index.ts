import { Rule } from '@cspm/core-engine';
import { azureStorageEncryptionRule } from './storage/encryption';
import { azureStoragePublicAccessRule } from './storage/public-access';

export const azureRules: Rule[] = [
  azureStorageEncryptionRule,
  azureStoragePublicAccessRule,
];
