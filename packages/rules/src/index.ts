import { Rule } from '@cspm/core-engine';
import { awsRules } from './aws';
import { azureRules } from './azure';
import { gcpRules } from './gcp';

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
];

export function getRulesByProvider(provider: string): Rule[] {
  const rulePackage = rulePackages.find(p => p.provider === provider);
  return rulePackage ? rulePackage.rules : [];
}

export function getAllRules(): Rule[] {
  return rulePackages.flatMap(p => p.rules);
}
