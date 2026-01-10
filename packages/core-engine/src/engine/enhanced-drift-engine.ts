import { DriftEngine } from './drift-engine';
import { AssetConfig } from '../schemas/asset';

export interface EnhancedDriftEvent {
  id?: string;
  assetId: string;
  oldConfigId?: string;
  newConfigId: string;
  changeType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  diff: any;
  summary: string;
  affectedPaths: string[];
  securityImpact: 'none' | 'low' | 'medium' | 'high';
  requiresReview: boolean;
  detectedAt: Date;
}

export class EnhancedDriftEngine extends DriftEngine {
  static detectEnhancedDrift(
    oldConfig: AssetConfig,
    newConfig: AssetConfig
  ): EnhancedDriftEvent | null {
    const basicDrift = super.detectDrift(oldConfig, newConfig);
    if (!basicDrift) return null;

    const enhancedDiff = this.analyzeDiff(basicDrift.diff);
    const changeType = this.determineChangeType(basicDrift.diff, oldConfig, newConfig);
    const severity = this.calculateSeverity(enhancedDiff, changeType);
    
    return {
      id: basicDrift.id,
      assetId: basicDrift.assetId,
      oldConfigId: basicDrift.oldConfigId,
      newConfigId: basicDrift.newConfigId,
      changeType,
      severity,
      diff: basicDrift.diff,
      summary: this.generateSummary(enhancedDiff, changeType),
      affectedPaths: this.getAffectedPaths(basicDrift.diff),
      securityImpact: this.assessSecurityImpact(enhancedDiff, oldConfig, newConfig),
      requiresReview: severity === 'high' || severity === 'critical',
      detectedAt: basicDrift.detectedAt,
    };
  }

  private static analyzeDiff(diff: any): any {
    const analysis: any = {
      added: 0,
      removed: 0,
      modified: 0,
      securityRelated: false,
      complianceRelated: false,
      nestedChanges: 0,
    };

    const analyzeObject = (obj: any, depth: number = 0) => {
      if (depth > 5) return; // Prevent infinite recursion

      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object') {
          if (value.action === 'added') analysis.added++;
          else if (value.action === 'removed') analysis.removed++;
          else if (value.action === 'modified') analysis.modified++;
          
          // Check for nested changes
          if (value.diff && typeof value.diff === 'object') {
            analysis.nestedChanges++;
            analyzeObject(value.diff, depth + 1);
          }

          // Check for security keywords
          const keyLower = key.toLowerCase();
          if (this.isSecurityKey(keyLower)) {
            analysis.securityRelated = true;
          }

          // Check for compliance keywords
          if (this.isComplianceKey(keyLower)) {
            analysis.complianceRelated = true;
          }
        }
      }
    };

    analyzeObject(diff);
    return analysis;
  }

  private static determineChangeType(diff: any, oldConfig: AssetConfig, newConfig: AssetConfig): string {
    const diffString = JSON.stringify(diff).toLowerCase();
    const analysis = this.analyzeDiff(diff);

    // Security-related changes
    if (analysis.securityRelated) {
      return 'security';
    }

    // Compliance-related changes
    if (analysis.complianceRelated) {
      return 'compliance';
    }

    // Tag/label changes
    if (diffString.includes('tag') || diffString.includes('label')) {
      return 'metadata';
    }

    // Access/permission changes
    if (diffString.includes('access') || 
        diffString.includes('permission') || 
        diffString.includes('policy') ||
        diffString.includes('role')) {
      return 'access';
    }

    // Network/connectivity changes
    if (diffString.includes('network') || 
        diffString.includes('subnet') || 
        diffString.includes('vpc') ||
        diffString.includes('port') ||
        diffString.includes('securitygroup')) {
      return 'network';
    }

    // Encryption changes
    if (diffString.includes('encrypt') || 
        diffString.includes('ssl') || 
        diffString.includes('tls') ||
        diffString.includes('kms')) {
      return 'encryption';
    }

    // Logging/monitoring changes
    if (diffString.includes('log') || 
        diffString.includes('monitor') || 
        diffString.includes('audit') ||
        diffString.includes('trail')) {
      return 'monitoring';
    }

    return 'configuration';
  }

  private static calculateSeverity(analysis: any, changeType: string): 'low' | 'medium' | 'high' | 'critical' {
    // Security changes are always high or critical
    if (changeType === 'security') {
      return analysis.modified > 3 ? 'critical' : 'high';
    }

    // Compliance changes are high
    if (changeType === 'compliance') {
      return 'high';
    }

    // Access and encryption changes are medium-high
    if (changeType === 'access' || changeType === 'encryption') {
      return 'medium';
    }

    // Network changes are medium
    if (changeType === 'network') {
      return 'medium';
    }

    // Metadata changes are low
    if (changeType === 'metadata') {
      return 'low';
    }

    // Based on number of changes
    const totalChanges = analysis.added + analysis.removed + analysis.modified;
    if (totalChanges > 10) return 'high';
    if (totalChanges > 5) return 'medium';
    return 'low';
  }

  private static generateSummary(analysis: any, changeType: string): string {
    const changes = [];
    if (analysis.added > 0) changes.push(`${analysis.added} added`);
    if (analysis.removed > 0) changes.push(`${analysis.removed} removed`);
    if (analysis.modified > 0) changes.push(`${analysis.modified} modified`);

    const changeDescription = changes.length > 0 ? changes.join(', ') : 'changes detected';
    return `${changeType.charAt(0).toUpperCase() + changeType.slice(1)} change: ${changeDescription}`;
  }

  private static getAffectedPaths(diff: any, path: string = ''): string[] {
    const paths: string[] = [];

    const traverse = (obj: any, currentPath: string) => {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (value && typeof value === 'object') {
          if (value.action) {
            paths.push(newPath);
          }
          if (value.diff) {
            traverse(value.diff, newPath);
          }
        }
      }
    };

    traverse(diff, path);
    return paths;
  }

  private static assessSecurityImpact(analysis: any, oldConfig: AssetConfig, newConfig: AssetConfig): 'none' | 'low' | 'medium' | 'high' {
    if (analysis.securityRelated) {
      // Analyze specific security impacts
      const diffString = JSON.stringify(analysis).toLowerCase();
      
      if (diffString.includes('public') && diffString.includes('true')) {
        return 'high'; // Made resource public
      }
      if (diffString.includes('encryption') && diffString.includes('false')) {
        return 'high'; // Disabled encryption
      }
      if (diffString.includes('password') || diffString.includes('secret')) {
        return 'critical'; // Password/secret change
      }
      return 'medium';
    }

    return analysis.complianceRelated ? 'medium' : 'none';
  }

  private static isSecurityKey(key: string): boolean {
    const securityKeywords = [
      'password', 'secret', 'key', 'token', 'credential',
      'auth', 'authentication', 'authorization', 'permission',
      'role', 'policy', 'access', 'public', 'private',
      'encrypt', 'encryption', 'ssl', 'tls', 'certificate',
      'firewall', 'securitygroup', 'acl', 'whitelist', 'blacklist',
      'mfa', '2fa', 'multifactor', 'login', 'signin'
    ];
    return securityKeywords.some(kw => key.includes(kw));
  }

  private static isComplianceKey(key: string): boolean {
    const complianceKeywords = [
      'compliance', 'audit', 'log', 'monitor', 'trail',
      'retention', 'backup', 'recovery', 'disaster',
      'gdpr', 'hipaa', 'pci', 'sox', 'iso',
      'cis', 'nist', 'soc'
    ];
    return complianceKeywords.some(kw => key.includes(kw));
  }

  static generateRevertScript(driftEvent: EnhancedDriftEvent, config: any): string {
    const service = config.service;
    const resourceId = config.resourceId;
    const revertScripts: string[] = [];

    revertScripts.push(`# Revert script for ${resourceId}`);
    revertScripts.push(`# Detected drift: ${driftEvent.summary}`);
    revertScripts.push(`# Change type: ${driftEvent.changeType}`);
    revertScripts.push('');

    if (service === 's3') {
      revertScripts.push('# AWS S3 Revert Commands');
      revertScripts.push(`aws s3api put-bucket-encryption \\\n  --bucket ${resourceId} \\\n  --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'`);
      revertScripts.push('');
      revertScripts.push(`aws s3api put-public-access-block \\\n  --bucket ${resourceId} \\\n  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"`);
    } else if (service === 'iam') {
      revertScripts.push('# AWS IAM Revert Commands');
      revertScripts.push('# Note: IAM changes often require manual review');
      revertScripts.push('# Check IAM policies and MFA configuration');
    }

    revertScripts.push('');
    revertScripts.push('# Always review revert scripts before executing');
    revertScripts.push('# This is an auto-generated suggestion');

    return revertScripts.join('\n');
  }
}
