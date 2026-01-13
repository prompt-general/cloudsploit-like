import { Rule, FindingStatus } from '@cspm/core-engine';

export const ociStorageEncryptionRule: Rule = {
  id: 'oci-objectstorage-bucket-encryption',
  provider: 'oci',
  service: 'objectstorage',
  resourceType: 'bucket',
  severity: 'high',
  description: 'Checks if OCI Object Storage bucket has encryption enabled',
  remediation: 'Enable encryption on the Object Storage bucket using customer-managed keys.',
  async evaluate(config: any): Promise<FindingStatus> {
    const bucket = config.bucket;
    
    if (!bucket) {
      return 'fail';
    }
    
    // Check if KMS key is configured
    if (bucket.kmsKeyId && bucket.kmsKeyId !== null && bucket.kmsKeyId !== '') {
      return 'pass';
    }
    
    return 'fail';
  },
};
