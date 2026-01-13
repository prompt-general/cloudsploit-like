import { Rule, FindingStatus } from '@cspm/core-engine';

export const githubRepositoryProtectionRule: Rule = {
  id: 'github-repository-protection',
  provider: 'github',
  service: 'repository',
  resourceType: 'repository',
  severity: 'medium',
  description: 'Checks if GitHub repository has proper branch protection rules',
  remediation: 'Configure branch protection rules and require status checks.',
  async evaluate(config: any): Promise<FindingStatus> {
    const protectionRules = config.protectionRules;
    
    if (!protectionRules) {
      return 'fail';
    }
    
    // Check critical protection features
    const criticalProtections = [
      protectionRules.requiredStatusChecks?.strict === true,
      protectionRules.enforceAdmins === true,
      protectionRules.requiredLinearHistory === true,
      !protectionRules.allowForcePushes
    ];
    
    if (criticalProtections.every(protection => protection === true)) {
      return 'pass';
    }
    
    // Partial pass if some protections are enabled
    const enabledProtections = criticalProtections.filter(protection => protection === true).length;
    if (enabledProtections >= 2) {
      return 'warn';
    }
    
    return 'fail';
  },
};
