import { Finding } from '../schemas/finding';
import { Asset } from '../schemas/asset';

export interface GitHubActionConfig {
  name: string;
  description: string;
  triggerEvents: string[];
  permissions: string[];
  environment?: string;
  timeoutMinutes: number;
  failOnError: boolean;
  commentOnPR: boolean;
  createStatusCheck: boolean;
}

export interface SecurityScanResult {
  scanId: string;
  repository: string;
  branch: string;
  commit: string;
  pullRequest?: string;
  timestamp: Date;
  status: 'passed' | 'failed' | 'warning';
  summary: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: Finding[];
  recommendations: string[];
  scanDuration: number;
}

export interface VSCodeExtensionConfig {
  enableRealTimeScanning: boolean;
  scanOnSave: boolean;
  scanOnOpen: boolean;
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  showRecommendations: boolean;
  enableAutoFix: boolean;
  supportedLanguages: string[];
  excludePatterns: string[];
}

export interface SlackBotConfig {
  botToken: string;
  channelId: string;
  mentionChannel: boolean;
  alertOnCritical: boolean;
  alertOnHigh: boolean;
  includeRecommendations: boolean;
  includeCodeSnippets: boolean;
  customEmoji: string;
}

export interface DeveloperSecurityTool {
  type: 'github-action' | 'vscode-extension' | 'slack-bot' | 'pre-commit-hook';
  name: string;
  description: string;
  enabled: boolean;
  config: GitHubActionConfig | VSCodeExtensionConfig | SlackBotConfig;
  lastUsed?: Date;
  usageStats: {
    scansPerformed: number;
    issuesPrevented: number;
    timeSaved: number; // hours
  };
}

export interface PreCommitHook {
  id: string;
  name: string;
  description: string;
  script: string;
  languages: string[];
  filePatterns: string[];
  enabled: boolean;
  timeoutSeconds: number;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityPolicyRule[];
  enabled: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  autoFix: boolean;
  exceptions: string[];
}

export interface SecurityPolicyRule {
  id: string;
  pattern: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'infrastructure' | 'code' | 'configuration' | 'secrets';
  regex?: string;
  customCheck?: string;
  fixSuggestion?: string;
}

export class DeveloperSecurityEngine {
  private securityTools: Map<string, DeveloperSecurityTool> = new Map();
  private preCommitHooks: Map<string, PreCommitHook> = new Map();
  private securityPolicies: Map<string, SecurityPolicy> = new Map();
  private scanHistory: Map<string, SecurityScanResult[]> = new Map();

  constructor() {
    this.initializeDefaultTools();
    this.initializeDefaultPolicies();
    this.initializeDefaultHooks();
  }

  /**
   * Generate GitHub Action workflow
   */
  generateGitHubAction(config: GitHubActionConfig): string {
    const workflow = this.createGitHubActionWorkflow(config);
    return workflow;
  }

  /**
   * Generate VS Code extension configuration
   */
  generateVSCodeConfig(config: VSCodeExtensionConfig): string {
    return JSON.stringify({
      name: 'cloudsploit-security-scanner',
      displayName: 'CloudSploit Security Scanner',
      description: 'Real-time security scanning for cloud infrastructure',
      version: '1.0.0',
      engines: {
        vscode: '^1.60.0'
      },
      categories: ['Linters', 'Security'],
      activationEvents: [
        'onLanguage:terraform',
        'onLanguage:cloudformation',
        'onLanguage:bicep',
        'onLanguage:yaml',
        'onLanguage:json'
      ],
      main: './out/extension.js',
      contributes: {
        commands: [
          {
            command: 'cloudsploit.scanWorkspace',
            title: 'CloudSploit: Scan Workspace'
          },
          {
            command: 'cloudsploit.scanFile',
            title: 'CloudSploit: Scan Current File'
          },
          {
            command: 'cloudsploit.fixIssues',
            title: 'CloudSploit: Auto Fix Issues'
          }
        ],
        configuration: {
          title: 'CloudSploit Security Scanner',
          properties: {
            'cloudsploit.enableRealTimeScanning': {
              type: 'boolean',
              default: config.enableRealTimeScanning,
              description: 'Enable real-time security scanning'
            },
            'cloudsploit.severityThreshold': {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              default: config.severityThreshold,
              description: 'Minimum severity level to report'
            },
            'cloudsploit.showRecommendations': {
              type: 'boolean',
              default: config.showRecommendations,
              description: 'Show security recommendations'
            }
          }
        }
      }
    }, null, 2);
  }

  /**
   * Generate Slack bot integration
   */
  generateSlackBot(config: SlackBotConfig): string {
    return `
const { App } = require('@slack/bolt');
const { CloudSploitScanner } = require('@cspm/core-engine');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const scanner = new CloudSploitScanner();

// Listen for security scan results
app.message('/security-scan', async ({ message, say }) => {
  await say('🔍 Starting security scan...');
  
  try {
    const result = await scanner.scanRepository();
    await say(formatSecurityResult(result));
  } catch (error) {
    await say(\`❌ Scan failed: \${error.message}\`);
  }
});

// Format security results for Slack
function formatSecurityResult(result) {
  const { summary, findings } = result;
  
  let message = \`🔍 **Security Scan Results**\n\n\`;
  message += \`📊 **Summary:**\n\`;
  message += \`• Critical: \${summary.critical}\n\`;
  message += \`• High: \${summary.high}\n\`;
  message += \`• Medium: \${summary.medium}\n\`;
  message += \`• Low: \${summary.low}\n\n\`;
  
  if (summary.critical > 0 || summary.high > 0) {
    message += \`🚨 **Critical Issues Found:**\n\`;
    findings
      .filter(f => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 5)
      .forEach(finding => {
        message += \`• \${finding.description}\n\`;
      });
  }
  
  return message;
}

// Security alerts integration
app.event('app_mention', async ({ event, say }) => {
  if (event.text.includes('security alert')) {
    await say('🚨 Security alerts are being monitored. Check your dashboard for details.');
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ CloudSploit Slack bot is running!');
})();
`;
  }

  /**
   * Generate pre-commit hooks
   */
  generatePreCommitHooks(hooks: PreCommitHook[]): string {
    const hookScripts: string[] = [];
    
    hooks.forEach(hook => {
      if (hook.enabled) {
        hookScripts.push(`
# ${hook.name}
# ${hook.description}
echo "Running ${hook.name}..."
${hook.script}
if [ $? -ne 0 ]; then
  echo "❌ ${hook.name} failed"
  exit 1
fi
echo "✅ ${hook.name} passed"
`);
      }
    });

    return `#!/bin/bash
# CloudSploit Pre-commit Security Hooks

${hookScripts.join('\n')}

echo "🔍 All security checks passed!"
`;
  }

  /**
   * Scan repository for security issues
   */
  async scanRepository(
    repositoryPath: string,
    branch: string,
    commit: string,
    pullRequest?: string
  ): Promise<SecurityScanResult> {
    const startTime = Date.now();
    
    try {
      // In real implementation, this would scan the actual repository
      const findings = await this.simulateRepositoryScan(repositoryPath);
      
      const summary = this.calculateSummary(findings);
      const status = this.determineScanStatus(summary);
      const recommendations = this.generateRecommendations(findings);
      const scanDuration = Date.now() - startTime;

      const result: SecurityScanResult = {
        scanId: `scan-${Date.now()}`,
        repository: repositoryPath,
        branch,
        commit,
        pullRequest,
        timestamp: new Date(),
        status,
        summary,
        findings,
        recommendations,
        scanDuration,
      };

      // Store in history
      const history = this.scanHistory.get(repositoryPath) || [];
      history.push(result);
      this.scanHistory.set(repositoryPath, history);

      return result;
    } catch (error) {
      throw new Error(`Repository scan failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create GitHub Action workflow YAML
   */
  private createGitHubActionWorkflow(config: GitHubActionConfig): string {
    return `name: ${config.name}

on:
  ${config.triggerEvents.map(event => `  ${event}:`).join('\n')}

permissions:
  ${config.permissions.map(perm => `  - ${perm}`).join('\n')}

jobs:
  security-scan:
    runs-on: ubuntu-latest
    timeout-minutes: ${config.timeoutMinutes}
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install CloudSploit CLI
      run: |
        npm install -g @cspm/cli
        
    - name: Run Security Scan
      run: |
        cloudsploit scan \\
          --provider all \\
          --format json \\
          --output security-report.json \\
          --severity-threshold medium
      continue-on-error: ${!config.failOnError}
      
    - name: Parse Results
      id: results
      run: |
        if [ -f security-report.json ]; then
          echo "results=$(cat security-report.json | jq -c '.')" >> $GITHUB_OUTPUT
          echo "scan_completed=true" >> $GITHUB_OUTPUT
        else
          echo "scan_completed=false" >> $GITHUB_OUTPUT
        fi
        
    - name: Comment on PR
      if: ${{ config.commentOnPR && github.event_name == 'pull_request' && steps.results.outputs.scan_completed == 'true' }}
      uses: actions/github-script@v7
      with:
        script: |
          const results = JSON.parse(\`\${{ steps.results.outputs.results }}\`);
          const summary = results.summary;
          
          const comment = \`
          ## 🔍 Security Scan Results
          
          **Status:** \${results.status === 'passed' ? '✅ Passed' : '❌ Failed'}
          
          ### Summary:
          - 🚨 Critical: \${summary.critical}
          - ⚠️ High: \${summary.high}
          - ℹ️ Medium: \${summary.medium}
          - 💡 Low: \${summary.low}
          
          \${results.findings.length > 0 ? '### Issues Found:\\n' + results.findings.slice(0, 10).map(f => \`- **\${f.severity.toUpperCase()}**: \${f.description}\`).join('\\n') : '✅ No security issues found!'}
          \`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
          
    - name: Create Status Check
      if: ${{ config.createStatusCheck }}
      uses: actions/github-script@v7
      with:
        script: |
          const results = JSON.parse(\`\${{ steps.results.outputs.results }}\`);
          
          github.rest.repos.createCommitStatus({
            owner: context.repo.owner,
            repo: context.repo.repo,
            sha: context.sha,
            state: results.status === 'passed' ? 'success' : 'failure',
            target_url: \`https://github.com/\${context.repo.owner}/\${context.repo.repo}/actions/runs/\${context.runId}\`,
            description: \`Security scan: \${results.status === 'passed' ? 'Passed' : 'Failed'} (\${results.summary.critical + results.summary.high} issues)\`,
            context: 'cloudsploit-security-scan'
          });
`;
  }

  /**
   * Simulate repository scanning
   */
  private async simulateRepositoryScan(repositoryPath: string): Promise<Finding[]> {
    // In real implementation, this would scan actual files
    const mockFindings: Finding[] = [
      {
        id: 'finding-1',
        rule: 's3-public-read',
        title: 'S3 Bucket with Public Read Access',
        description: 'S3 bucket allows public read access',
        severity: 'critical',
        assetId: 'bucket-example',
        provider: 'aws',
        service: 's3',
        region: 'us-east-1',
        compliance: [
          { framework: 'CIS', control: '2.1.1' },
          { framework: 'SOC2', control: 'CC6.1' }
        ],
        remediation: {
          description: 'Remove public access from S3 bucket',
          code: 'aws s3api put-public-access-block --bucket example-bucket --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"'
        },
        cvss: {
          attackVector: 'network',
          attackComplexity: 'low',
          privilegesRequired: 'none',
          userInteraction: 'none',
          scope: 'unchanged',
          confidentialityImpact: 'high',
          integrityImpact: 'none',
          availabilityImpact: 'none'
        }
      },
      {
        id: 'finding-2',
        rule: 'iam-overprivileged',
        title: 'Overprivileged IAM Role',
        description: 'IAM role has excessive permissions',
        severity: 'high',
        assetId: 'role-example',
        provider: 'aws',
        service: 'iam',
        region: 'us-east-1',
        compliance: [
          { framework: 'CIS', control: '1.1.0' },
          { framework: 'NIST', control: 'AC-3' }
        ],
        remediation: {
          description: 'Reduce IAM role permissions',
          code: 'aws iam detach-role-policy --role-name example-role --policy-arn arn:aws:iam::aws:policy/AdministratorAccess'
        }
      }
    ];

    return mockFindings;
  }

  /**
   * Calculate scan summary
   */
  private calculateSummary(findings: Finding[]) {
    return {
      totalFindings: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    };
  }

  /**
   * Determine scan status
   */
  private determineScanStatus(summary: any): 'passed' | 'failed' | 'warning' {
    if (summary.critical > 0) return 'failed';
    if (summary.high > 0) return 'warning';
    return 'passed';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(findings: Finding[]): string[] {
    const recommendations: string[] = [];

    if (findings.some(f => f.severity === 'critical')) {
      recommendations.push('🚨 Critical security issues found. Address immediately before merging.');
    }

    if (findings.some(f => f.severity === 'high')) {
      recommendations.push('⚠️ High-severity issues detected. Review and fix before production deployment.');
    }

    if (findings.some(f => f.rule?.includes('public'))) {
      recommendations.push('🔒 Remove public access from cloud resources to prevent unauthorized access.');
    }

    if (findings.some(f => f.rule?.includes('encryption'))) {
      recommendations.push('🔐 Enable encryption for sensitive data at rest and in transit.');
    }

    if (findings.some(f => f.rule?.includes('iam'))) {
      recommendations.push('👤 Apply principle of least privilege to IAM roles and policies.');
    }

    return recommendations;
  }

  /**
   * Initialize default developer tools
   */
  private initializeDefaultTools(): void {
    // GitHub Action
    this.securityTools.set('github-action', {
      type: 'github-action',
      name: 'CloudSploit Security Scan',
      description: 'Automated security scanning in CI/CD pipeline',
      enabled: true,
      config: {
        name: 'CloudSploit Security Scan',
        description: 'Run security scan on pull requests and pushes',
        triggerEvents: ['push', 'pull_request'],
        permissions: ['contents: read', 'pull-requests: write', 'checks: write'],
        timeoutMinutes: 10,
        failOnError: true,
        commentOnPR: true,
        createStatusCheck: true,
      } as GitHubActionConfig,
      usageStats: {
        scansPerformed: 0,
        issuesPrevented: 0,
        timeSaved: 0,
      },
    });

    // VS Code Extension
    this.securityTools.set('vscode-extension', {
      type: 'vscode-extension',
      name: 'CloudSploit Security Scanner',
      description: 'Real-time security scanning in VS Code',
      enabled: true,
      config: {
        enableRealTimeScanning: true,
        scanOnSave: true,
        scanOnOpen: false,
        severityThreshold: 'medium',
        showRecommendations: true,
        enableAutoFix: false,
        supportedLanguages: ['terraform', 'cloudformation', 'bicep', 'yaml', 'json'],
        excludePatterns: ['*.log', '*.tmp', 'node_modules/**'],
      } as VSCodeExtensionConfig,
      usageStats: {
        scansPerformed: 0,
        issuesPrevented: 0,
        timeSaved: 0,
      },
    });

    // Slack Bot
    this.securityTools.set('slack-bot', {
      type: 'slack-bot',
      name: 'CloudSploit Security Bot',
      description: 'Security notifications and alerts in Slack',
      enabled: true,
      config: {
        botToken: 'xoxb-your-bot-token',
        channelId: '#security',
        mentionChannel: true,
        alertOnCritical: true,
        alertOnHigh: true,
        includeRecommendations: true,
        includeCodeSnippets: false,
        customEmoji: ':shield:',
      } as SlackBotConfig,
      usageStats: {
        scansPerformed: 0,
        issuesPrevented: 0,
        timeSaved: 0,
      },
    });
  }

  /**
   * Initialize default security policies
   */
  private initializeDefaultPolicies(): void {
    const policies: SecurityPolicy[] = [
      {
        id: 'no-public-storage',
        name: 'No Public Storage Access',
        description: 'Prevent public access to storage resources',
        rules: [
          {
            id: 's3-public-check',
            pattern: '"BlockPublicAcls": false',
            description: 'S3 bucket should block public ACLs',
            severity: 'critical',
            category: 'infrastructure',
            regex: '"BlockPublicAcls":\\s*false',
            fixSuggestion: 'Set BlockPublicAcls to true in S3 bucket configuration'
          },
          {
            id: 'storage-public-check',
            pattern: 'public_access_enabled',
            description: 'Storage account should not have public access enabled',
            severity: 'critical',
            category: 'infrastructure',
            regex: 'public_access_enabled.*true',
            fixSuggestion: 'Disable public access on storage accounts'
          }
        ],
        enabled: true,
        severity: 'critical',
        autoFix: false,
        exceptions: [],
      },
      {
        id: 'encryption-required',
        name: 'Encryption Required',
        description: 'All sensitive data must be encrypted',
        rules: [
          {
            id: 'encryption-at-rest',
            pattern: '"encrypted": false',
            description: 'Data should be encrypted at rest',
            severity: 'high',
            category: 'infrastructure',
            regex: '"encrypted":\\s*false',
            fixSuggestion: 'Enable encryption for storage resources'
          }
        ],
        enabled: true,
        severity: 'high',
        autoFix: true,
        exceptions: [],
      },
      {
        id: 'no-secrets-in-code',
        name: 'No Secrets in Code',
        description: 'Prevent hardcoded secrets in configuration files',
        rules: [
          {
            id: 'aws-keys',
            pattern: 'AKIA[0-9A-Z]{16}',
            description: 'AWS access keys should not be hardcoded',
            severity: 'critical',
            category: 'secrets',
            regex: 'AKIA[0-9A-Z]{16}',
            fixSuggestion: 'Use environment variables or secret management'
          },
          {
            id: 'password-pattern',
            pattern: 'password\\s*:\\s*["\'][^"\']+["\']',
            description: 'Passwords should not be hardcoded',
            severity: 'critical',
            category: 'secrets',
            regex: 'password\\s*:\\s*["\'][^"\']+["\']',
            fixSuggestion: 'Use secret management for passwords'
          }
        ],
        enabled: true,
        severity: 'critical',
        autoFix: false,
        exceptions: [],
      },
    ];

    policies.forEach(policy => {
      this.securityPolicies.set(policy.id, policy);
    });
  }

  /**
   * Initialize default pre-commit hooks
   */
  private initializeDefaultHooks(): void {
    const hooks: PreCommitHook[] = [
      {
        id: 'terraform-scan',
        name: 'Terraform Security Scan',
        description: 'Scan Terraform files for security issues',
        script: `
# Find all .tf files
tf_files=$(git diff --cached --name-only --diff-filter=ACM | grep '\\.tf$')

if [ -n "$tf_files" ]; then
  echo "Scanning Terraform files..."
  for file in $tf_files; do
    cloudsploit scan --file "$file" --format json
    if [ $? -ne 0 ]; then
      echo "Security issues found in $file"
      exit 1
    fi
  done
fi
        `,
        languages: ['terraform', 'hcl'],
        filePatterns: ['*.tf', '*.tfvars'],
        enabled: true,
        timeoutSeconds: 30,
      },
      {
        id: 'cloudformation-scan',
        name: 'CloudFormation Security Scan',
        description: 'Scan CloudFormation templates for security issues',
        script: `
# Find all CloudFormation files
cf_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(yaml|yml|json)$')

if [ -n "$cf_files" ]; then
  echo "Scanning CloudFormation files..."
  for file in $cf_files; do
    if grep -q "AWSTemplateFormatVersion\\|Resources:" "$file"; then
      cloudsploit scan --file "$file" --format json
      if [ $? -ne 0 ]; then
        echo "Security issues found in $file"
        exit 1
      fi
    fi
  done
fi
        `,
        languages: ['yaml', 'json'],
        filePatterns: ['*.yaml', '*.yml', '*.json'],
        enabled: true,
        timeoutSeconds: 30,
      },
      {
        id: 'secrets-scan',
        name: 'Secrets Detection',
        description: 'Detect hardcoded secrets in files',
        script: `
# Scan for common secret patterns
if git diff --cached --name-only | xargs grep -E "(password|secret|key|token).*=.*['\\"][^'\\"]{8,}['\\"]"; then
  echo "❌ Potential secrets detected in staged files"
  echo "Please remove hardcoded secrets and use secure credential management"
  exit 1
fi

echo "✅ No secrets detected"
        `,
        languages: ['all'],
        filePatterns: ['*'],
        enabled: true,
        timeoutSeconds: 10,
      },
    ];

    hooks.forEach(hook => {
      this.preCommitHooks.set(hook.id, hook);
    });
  }

  /**
   * Get all security tools
   */
  getSecurityTools(): DeveloperSecurityTool[] {
    return Array.from(this.securityTools.values());
  }

  /**
   * Get security policies
   */
  getSecurityPolicies(): SecurityPolicy[] {
    return Array.from(this.securityPolicies.values());
  }

  /**
   * Get pre-commit hooks
   */
  getPreCommitHooks(): PreCommitHook[] {
    return Array.from(this.preCommitHooks.values());
  }

  /**
   * Get scan history
   */
  getScanHistory(repositoryPath: string, limit?: number): SecurityScanResult[] {
    const history = this.scanHistory.get(repositoryPath) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Update security tool configuration
   */
  updateSecurityTool(toolId: string, updates: Partial<DeveloperSecurityTool>): boolean {
    const tool = this.securityTools.get(toolId);
    if (!tool) return false;

    const updatedTool = { ...tool, ...updates };
    this.securityTools.set(toolId, updatedTool);
    return true;
  }

  /**
   * Enable/disable security tool
   */
  toggleSecurityTool(toolId: string, enabled: boolean): boolean {
    const tool = this.securityTools.get(toolId);
    if (!tool) return false;

    tool.enabled = enabled;
    return true;
  }
}
