import { Asset, AssetConfig } from '../schemas/asset';
import { Finding, FindingStatus, Rule } from '../schemas/finding';

export class RuleRunner {
  private rules: Map<string, Rule> = new Map();

  registerRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  registerRules(rules: Rule[]): void {
    rules.forEach(rule => this.registerRule(rule));
  }

  async evaluateRule(ruleId: string, asset: Asset, config: AssetConfig): Promise<Finding | null> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    // Check if rule applies to this asset
    if (rule.provider !== asset.provider || 
        rule.resourceType !== asset.resourceType) {
      return null;
    }

    try {
      const status = await rule.evaluate(config.rawConfig);
      
      return {
        ruleId: rule.id,
        assetId: asset.id!,
        status,
        severity: rule.severity,
        evidence: {
          rule: rule.description,
          resource: asset.resourceId,
          config: config.rawConfig,
        },
      };
    } catch (error) {
      console.error(`Error evaluating rule ${ruleId}:`, error);
      return null;
    }
  }

  async evaluateAllRules(asset: Asset, config: AssetConfig): Promise<Finding[]> {
    const findings: Finding[] = [];
    const applicableRules = Array.from(this.rules.values()).filter(
      rule => rule.provider === asset.provider && 
              rule.resourceType === asset.resourceType
    );

    for (const rule of applicableRules) {
      const finding = await this.evaluateRule(rule.id, asset, config);
      if (finding) {
        findings.push(finding);
      }
    }

    return findings;
  }

  getRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  getRule(ruleId: string): Rule | undefined {
    return this.rules.get(ruleId);
  }
}
