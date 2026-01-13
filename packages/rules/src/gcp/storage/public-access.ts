import { Rule, FindingStatus } from '@cspm/core-engine';

export const gcpStoragePublicAccessRule: Rule = {
  id: 'gcp-storage-bucket-public-access',
  provider: 'gcp',
  service: 'storage',
  resourceType: 'gcs-bucket',
  severity: 'critical',
  description: 'Checks if GCS Bucket allows public access',
  remediation: 'Remove public IAM policies and enable uniform bucket-level access.',
  async evaluate(config: any): Promise<FindingStatus> {
    const bucket = config.bucket;
    const iamPolicy = config.iamPolicy;
    
    if (!bucket) {
      return 'fail';
    }
    
    // Check if public access prevention is disabled
    if (bucket.publicAccessPrevention === false) {
      return 'fail';
    }
    
    // Check IAM policy for public access
    if (iamPolicy && iamPolicy.bindings) {
      const publicBindings = iamPolicy.bindings.filter((binding: any) => {
        return binding.members && binding.members.some((member: string) => 
          member === 'allUsers' || member === 'allAuthenticatedUsers'
        );
      });
      
      if (publicBindings.length > 0) {
        return 'fail';
      }
    }
    
    return 'pass';
  },
};
