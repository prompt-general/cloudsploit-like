import { createHash } from 'crypto';
import { AssetConfig } from '../schemas/asset';

export interface DriftEvent {
  assetId: string;
  oldConfigId?: string;
  newConfigId: string;
  changeType?: string;
  diff: Record<string, any>;
  detectedAt: Date;
}

export class DriftEngine {
  static computeHash(config: Record<string, any>): string {
    // Normalize config for consistent hashing
    const normalized = JSON.stringify(config, Object.keys(config).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  static detectDrift(
    oldConfig: AssetConfig, 
    newConfig: AssetConfig
  ): DriftEvent | null {
    
    if (oldConfig.configHash === newConfig.configHash) {
      return null;
    }

    const diff = this.computeDiff(oldConfig.rawConfig, newConfig.rawConfig);
    
    return {
      assetId: newConfig.assetId,
      oldConfigId: oldConfig.id,
      newConfigId: newConfig.id!,
      changeType: this.classifyChange(diff),
      diff,
      detectedAt: new Date(),
    };
  }

  private static computeDiff(oldObj: any, newObj: any, path: string = ''): any {
    const diff: any = {};
    
    // Get all keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {})
    ]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldVal = oldObj?.[key];
      const newVal = newObj?.[key];

      if (oldVal === undefined && newVal !== undefined) {
        // Added
        diff[key] = { action: 'added', value: newVal };
      } else if (oldVal !== undefined && newVal === undefined) {
        // Removed
        diff[key] = { action: 'removed', value: oldVal };
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        // Changed
        if (typeof oldVal === 'object' && typeof newVal === 'object') {
          const nestedDiff = this.computeDiff(oldVal, newVal, currentPath);
          if (Object.keys(nestedDiff).length > 0) {
            diff[key] = { action: 'modified', diff: nestedDiff };
          }
        } else {
          diff[key] = { 
            action: 'modified', 
            old: oldVal, 
            new: newVal 
          };
        }
      }
    }

    return diff;
  }

  private static classifyChange(diff: any): string {
    const securityKeywords = [
      'public', 'private', 'encrypt', 'ssl', 'tls', 'auth', 
      'permission', 'role', 'policy', 'access', 'firewall',
      'log', 'audit', 'compliance'
    ];

    const diffString = JSON.stringify(diff).toLowerCase();
    
    // Check if any security-related keywords are in the diff
    if (securityKeywords.some(keyword => diffString.includes(keyword))) {
      return 'security';
    }

    // Check if it's a tag change
    if (diffString.includes('tag') || diffString.includes('label')) {
      return 'metadata';
    }

    return 'configuration';
  }
}
