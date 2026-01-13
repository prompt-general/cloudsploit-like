import { Rule, FindingStatus } from '@cspm/core-engine';

export const azureStoragePublicAccessRule: Rule = {
  id: 'azure-storage-account-public-access',
  provider: 'azure',
  service: 'storage',
  resourceType: 'storage-account',
  severity: 'critical',
  description: 'Checks if Azure Storage Account allows public access',
  remediation: 'Disable public access on storage account and configure network rules.',
  async evaluate(config: any): Promise<FindingStatus> {
    const containers = config.containers || [];
    
    // Check if any container has public access
    const publicContainers = containers.filter((container: any) => 
      container.publicAccess && container.publicAccess !== 'None'
    );
    
    if (publicContainers.length > 0) {
      return 'fail';
    }
    
    // Check if public network access is allowed
    if (config.storageAccount && 
        config.storageAccount.publicNetworkAccess === 'Enabled') {
      return 'warn';
    }
    
    // Check if blob public access is allowed at account level
    if (config.storageAccount && 
        config.storageAccount.allowBlobPublicAccess === true) {
      return 'fail';
    }
    
    return 'pass';
  },
};
