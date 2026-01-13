import { Rule, FindingStatus } from '@cspm/core-engine';

export const githubRepositorySecurityRule: Rule = {
  id: 'github-repository-security',
  provider: 'github',
  service: 'repository',
  resourceType: 'repository',
  severity: 'high',
  description: 'Checks if GitHub repository has security features enabled',
  remediation: 'Enable GitHub Advanced Security features and configure proper protection rules.',
  async evaluate(config: any): Promise<FindingStatus> {
    const repository = config.repository;
    const securityAndAnalysis = config.securityAndAnalysis;
    
    if (!repository) {
      return 'fail';
    }
    
    // Check if Advanced Security is enabled
    if (!securityAndAnalysis || !securityAndAnalysis.advancedSecurity) {
      return 'fail';
    }
    
    const advancedSecurity = securityAndAnalysis.advancedSecurity;
    
    // Check critical security features
    const criticalFeatures = [
      advancedSecurity.dependabotSecurityUpdates?.status === 'enabled',
      advancedSecurity.codeScanningAlerts?.status === 'enabled',
      advancedSecurity.secretScanning?.status === 'enabled'
    ];
    
    if (criticalFeatures.every(feature => feature === true)) {
      return 'pass';
    }
    
    // Partial pass if some features are enabled
    const enabledFeatures = criticalFeatures.filter(feature => feature === true).length;
    if (enabledFeatures >= 2) {
      return 'warn';
    }
    
    return 'fail';
  },
};
