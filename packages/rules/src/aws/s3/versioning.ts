import { Rule, FindingStatus } from '@cspm/core-engine';

export const s3VersioningRule: Rule = {
  id: 'aws-s3-bucket-versioning',
  provider: 'aws',
  service: 's3',
  resourceType: 's3_bucket',
  severity: 'medium',
  description: 'Checks if S3 bucket has versioning enabled',
  remediation: 'Enable versioning on the S3 bucket to protect against accidental deletion.',
  async evaluate(config: any): Promise<FindingStatus> {
    const versioning = config.versioning;
    
    if (!versioning || versioning.Status !== 'Enabled') {
      return 'fail';
    }

    return 'pass';
  },
};
