import { Rule, FindingStatus } from '@cspm/core-engine';

export const s3EncryptionRule: Rule = {
  id: 'aws-s3-bucket-encryption',
  provider: 'aws',
  service: 's3',
  resourceType: 's3_bucket',
  severity: 'medium',
  description: 'Checks if S3 bucket has server-side encryption enabled',
  remediation: 'Enable default server-side encryption on the S3 bucket.',
  async evaluate(config: any): Promise<FindingStatus> {
    const encryption = config.encryption;
    
    if (!encryption || !encryption.Rules || encryption.Rules.length === 0) {
      return 'fail';
    }

    // Check if at least one rule has SSE enabled
    const hasEncryption = encryption.Rules.some((rule: any) => {
      return rule.ApplyServerSideEncryptionByDefault?.SSEAlgorithm;
    });

    return hasEncryption ? 'pass' : 'fail';
  },
};
