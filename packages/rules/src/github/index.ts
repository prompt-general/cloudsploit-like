import { Rule } from '@cspm/core-engine';
import { githubRepositorySecurityRule } from './repository/security';
import { githubRepositoryProtectionRule } from './repository/protection';

export const githubRules: Rule[] = [
  githubRepositorySecurityRule,
  githubRepositoryProtectionRule,
];
