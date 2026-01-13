import { Rule, FindingStatus } from '@cspm/core-engine';

export const gcpStorageEncryptionRule: Rule = {
  id: 'gcp-storage-bucket-encryption',
  provider: 'gcp',
  service: 'storage',
  resourceType: 'gcs-bucket',
  severity: 'high',
  description: 'Checks if GCS Bucket has encryption enabled',
  remediation: 'Enable encryption on GCS bucket using Google-managed keys or customer-managed keys.',
  async evaluate(config: any): Promise<FindingStatus> {
    const bucket = config.bucket;
    
    if (!bucket) {
      return 'fail';
    }
    
    // Check if encryption is enabled
    if (bucket.encryption && 
        bucket.encryption.defaultKmsKeyName) {
      return 'pass';
    }
    
    return 'fail';
  },
};
