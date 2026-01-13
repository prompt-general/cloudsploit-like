import { Rule } from '@cspm/core-engine';
import { awsRules } from './aws';
import { azureRules } from './azure';
import { gcpRules } from './gcp';
import { ociRules } from './oci';
import { githubRules } from './github';

export interface RulePackage {
  provider: string;
  rules: Rule[];
}

export const rulePackages: RulePackage[] = [
  {
    provider: 'aws',
    rules: awsRules,
  },
  {
    provider: 'azure',
    rules: azureRules,
  },
  {
    provider: 'gcp',
    rules: gcpRules,
  },
  {
    provider: 'oci',
    rules: ociRules,
  },
  {
    provider: 'github',
    rules: githubRules,
  },
];

export function getRulesByProvider(provider: string): Rule[] {
  const rulePackage = rulePackages.find(p => p.provider === provider);
  return rulePackage ? rulePackage.rules : [];
}

export function getAllRules(): Rule[] {
  return rulePackages.flatMap(p => p.rules);
}
