import { Rule } from '@cspm/core-engine';
import { awsRules } from './aws';

export interface RulePackage {
  provider: string;
  rules: Rule[];
}

export const rulePackages: RulePackage[] = [
  {
    provider: 'aws',
    rules: awsRules,
  },
];

export function getRulesByProvider(provider: string): Rule[] {
  const package = rulePackages.find(p => p.provider === provider);
  return package ? package.rules : [];
}

export function getAllRules(): Rule[] {
  return rulePackages.flatMap(p => p.rules);
}
