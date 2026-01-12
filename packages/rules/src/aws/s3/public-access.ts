import { Rule, FindingStatus } from '@cspm/core-engine';

export const s3PublicAccessRule: Rule = {
  id: 'aws-s3-bucket-public-access',
  provider: 'aws',
  service: 's3',
  resourceType: 's3_bucket',
  severity: 'high',
  description: 'Checks if S3 bucket has public access blocked',
  remediation: 'Enable public access block on the S3 bucket.',
  async evaluate(config: any): Promise<FindingStatus> {
    const publicAccessBlock = config.publicAccessBlockConfiguration;
    const acl = config.acl;
    const policy = config.policy;
    
    // Check if public access block is properly configured
    if (publicAccessBlock) {
      const allBlocked = 
        publicAccessBlock.blockPublicAcls === true &&
        publicAccessBlock.blockPublicPolicy === true &&
        publicAccessBlock.ignorePublicAcls === true &&
        publicAccessBlock.restrictPublicBuckets === true;
      
      if (allBlocked) {
        return 'pass';
      }
    }
    
    // Check for public ACLs
    if (acl && (acl.AllUsers || acl.AuthenticatedUsers)) {
      return 'fail';
    }
    
    // Check for public policy statements
    if (policy && policy.Statement) {
      const hasPublicStatement = policy.Statement.some((statement: any) => {
        if (statement.Effect !== 'Allow') return false;
        
        const principal = statement.Principal;
        return principal === '*' || 
               (typeof principal === 'object' && 
                (principal.AWS === '*' || 
                 (Array.isArray(principal.AWS) && principal.AWS.includes('*'))));
      });
      
      if (hasPublicStatement) {
        return 'fail';
      }
    }
    
    return 'warn'; // Not explicitly blocked, but no obvious public access found
  },
};
