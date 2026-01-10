import { Rule, FindingStatus } from '@cspm/core-engine';

export const iamMFARule: Rule = {
  id: 'aws-iam-user-mfa-enabled',
  provider: 'aws',
  service: 'iam',
  resourceType: 'iam_user',
  severity: 'high',
  description: 'Checks if IAM user has MFA enabled',
  remediation: 'Enable MFA for all IAM users with console access.',
  async evaluate(config: any): Promise<FindingStatus> {
    const mfaDevices = config.mfaDevices;
    const loginProfile = config.loginProfile;
    
    // If user has console access (login profile) but no MFA
    if (loginProfile && (!mfaDevices || mfaDevices.length === 0)) {
      return 'fail';
    }

    return 'pass';
  },
};
