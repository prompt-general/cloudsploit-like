import { Rule, FindingStatus } from '@cspm/core-engine';

export const azureStorageEncryptionRule: Rule = {
  id: 'azure-storage-account-encryption',
  provider: 'azure',
  service: 'storage',
  resourceType: 'storage-account',
  severity: 'high',
  description: 'Checks if Azure Storage Account has encryption enabled',
  remediation: 'Enable encryption on the storage account using Microsoft-managed keys or customer-managed keys.',
  async evaluate(config: any): Promise<FindingStatus> {
    const encryption = config.encryption;
    
    if (!encryption) {
      return 'fail';
    }
    
    // Check if encryption is enabled with valid key source
    if (encryption.keySource && 
        (encryption.keySource.type === 'Microsoft.Storage' || 
         encryption.keySource.type === 'Microsoft.Keyvault')) {
      return 'pass';
    }
    
    return 'fail';
  },
};
