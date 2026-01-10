import { Rule, FindingStatus } from '@cspm/core-engine';

export const iamAccessKeyAgeRule: Rule = {
  id: 'aws-iam-access-key-age',
  provider: 'aws',
  service: 'iam',
  resourceType: 'iam_user',
  severity: 'medium',
  description: 'Checks if IAM access keys are older than 90 days',
  remediation: 'Rotate access keys that are older than 90 days.',
  async evaluate(config: any): Promise<FindingStatus> {
    const accessKeys = config.accessKeys;
    
    if (!accessKeys || accessKeys.length === 0) {
      return 'pass'; // No access keys is okay
    }

    const now = new Date();
    const maxAgeDays = 90;
    
    for (const key of accessKeys) {
      if (key.Status === 'Active') {
        const createDate = new Date(key.CreateDate);
        const ageDays = (now.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (ageDays > maxAgeDays) {
          return 'fail';
        }
      }
    }

    return 'pass';
  },
};
