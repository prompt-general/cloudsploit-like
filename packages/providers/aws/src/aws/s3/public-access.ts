import { Rule, FindingStatus } from '@cspm/core-engine';

export const s3PublicAccessRule: Rule = {
  id: 'aws-s3-bucket-public-access',
  provider: 'aws',
  service: 's3',
  resourceType: 's3_bucket',
  severity: 'high',
  description: 'Checks if S3 bucket allows public access',
  remediation: 'Configure S3 bucket to block public access and review bucket policies.',
  async evaluate(config: any): Promise<FindingStatus> {
    // Check if public access is blocked
    const publicAccessBlock = config.publicAccessBlock;
    if (publicAccessBlock) {
      const isBlocked = publicAccessBlock.BlockPublicAcls &&
                       publicAccessBlock.BlockPublicPolicy &&
                       publicAccessBlock.IgnorePublicAcls &&
                       publicAccessBlock.RestrictPublicBuckets;
      
      if (!isBlocked) {
        return 'fail';
      }
    }

    // Check bucket policy for public statements
    const policy = config.policy;
    if (policy) {
      const statements = policy.Statement || [];
      for (const statement of statements) {
        if (statement.Effect === 'Allow' && 
            (statement.Principal === '*' || 
             statement.Principal?.AWS === '*' || 
             statement.Principal?.Service === '*')) {
          return 'fail';
        }
      }
    }

    // Check ACL for public grants
    const acl = config.acl;
    if (acl && acl.Grants) {
      for (const grant of acl.Grants) {
        const grantee = grant.Grantee;
        if (grantee && (grantee.URI === 'http://acs.amazonaws.com/groups/global/AllUsers' ||
                       grantee.URI === 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers')) {
          return 'fail';
        }
      }
    }

    return 'pass';
  },
};
