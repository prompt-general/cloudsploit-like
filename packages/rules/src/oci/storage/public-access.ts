import { Rule, FindingStatus } from '@cspm/core-engine';

export const ociStoragePublicAccessRule: Rule = {
  id: 'oci-objectstorage-bucket-public-access',
  provider: 'oci',
  service: 'objectstorage',
  resourceType: 'bucket',
  severity: 'critical',
  description: 'Checks if OCI Object Storage bucket allows public access',
  remediation: 'Disable public access and configure proper IAM policies.',
  async evaluate(config: any): Promise<FindingStatus> {
    const bucket = config.bucket;
    
    if (!bucket) {
      return 'fail';
    }
    
    // Check if public access is explicitly denied
    if (bucket.publicAccessType === 'NoPublicAccess') {
      return 'pass';
    }
    
    // Check for pre-authenticated requests
    if (config.preauthenticatedRequests && config.preauthenticatedRequests.length > 0) {
      return 'warn';
    }
    
    return 'fail';
  },
};
