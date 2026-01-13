import { Finding } from '../schemas/finding';
import { Asset } from '../schemas/asset';

export interface ComplianceBaseline {
  id: string;
  name: string;
  framework: string;
  version: string;
  description: string;
  controls: ComplianceControl[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  metadata: Record<string, any>;
}

export interface ComplianceControl {
  id: string;
  controlId: string;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  implementation: string;
  validation: string;
  automated: boolean;
  evidenceRequired: string[];
  mappings: {
    nist?: string;
    iso27001?: string;
    soc2?: string;
    pciDss?: string;
    cis?: string;
    gdpr?: string;
    hipaa?: string;
  };
}

export interface ComplianceEvidence {
  id: string;
  controlId: string;
  assetId: string;
  type: 'screenshot' | 'log' | 'configuration' | 'report' | 'test_result' | 'policy_document';
  title: string;
  description: string;
  filePath?: string;
  url?: string;
  content?: string;
  timestamp: Date;
  expiresAt?: Date;
  verified: boolean;
  verifiedBy?: string;
  metadata: Record<string, any>;
}

export interface ComplianceReport {
  id: string;
  framework: string;
  version: string;
  reportType: 'assessment' | 'audit' | 'continuous_monitoring';
  period: {
    start: Date;
    end: Date;
  };
  overallScore: number;
  status: 'compliant' | 'non_compliant' | 'partial_compliance';
  summary: {
    totalControls: number;
    compliantControls: number;
    nonCompliantControls: number;
    notApplicableControls: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
  };
  controlResults: ControlResult[];
  evidence: ComplianceEvidence[];
  recommendations: ComplianceRecommendation[];
  generatedAt: Date;
  generatedBy: string;
}

export interface ControlResult {
  controlId: string;
  status: 'compliant' | 'non_compliant' | 'not_applicable' | 'not_tested';
  score: number;
  findings: Finding[];
  evidence: ComplianceEvidence[];
  lastAssessed: Date;
  notes?: string;
}

export interface ComplianceRecommendation {
  id: string;
  controlId: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementationSteps: string[];
  estimatedEffort: number; // days
  dependencies: string[];
  riskReduction: number; // percentage
  costImpact: 'low' | 'medium' | 'high';
}

export interface TerraformModule {
  name: string;
  description: string;
  version: string;
  source: string;
  variables: TerraformVariable[];
  outputs: TerraformOutput[];
  resources: TerraformResource[];
  complianceControls: string[];
  examples: string[];
}

export interface TerraformVariable {
  name: string;
  type: string;
  description: string;
  default?: any;
  required: boolean;
  sensitive: boolean;
}

export interface TerraformOutput {
  name: string;
  description: string;
  value: string;
  sensitive: boolean;
}

export interface TerraformResource {
  type: string;
  name: string;
  properties: Record<string, any>;
  complianceTags: string[];
}

export interface ComplianceAsCodeConfig {
  frameworks: string[];
  autoGenerateEvidence: boolean;
  evidenceRetentionDays: number;
  enableContinuousMonitoring: boolean;
  generateTerraformModules: boolean;
  exportFormats: ('json' | 'yaml' | 'terraform' | 'cloudformation' | 'arm')[];
}

export class ComplianceAsCodeEngine {
  private config: ComplianceAsCodeConfig;
  private baselines: Map<string, ComplianceBaseline> = new Map();
  private evidence: Map<string, ComplianceEvidence[]> = new Map();
  private reports: Map<string, ComplianceReport> = new Map();
  private terraformModules: Map<string, TerraformModule> = new Map();

  constructor(config?: Partial<ComplianceAsCodeConfig>) {
    this.config = {
      frameworks: ['CIS', 'SOC2', 'PCI-DSS', 'NIST', 'ISO27001'],
      autoGenerateEvidence: true,
      evidenceRetentionDays: 2555, // 7 years
      enableContinuousMonitoring: true,
      generateTerraformModules: true,
      exportFormats: ['json', 'yaml', 'terraform'],
      ...config,
    };

    this.initializeDefaultBaselines();
  }

  /**
   * Generate compliance baseline as code
   */
  async generateComplianceBaseline(
    framework: string,
    assets: Asset[],
    findings: Finding[]
  ): Promise<ComplianceBaseline> {
    const controls = await this.generateFrameworkControls(framework);
    const baseline: ComplianceBaseline = {
      id: `baseline-${framework.toLowerCase()}-${Date.now()}`,
      name: `${framework} Compliance Baseline`,
      framework,
      version: '1.0.0',
      description: `Comprehensive ${framework} compliance baseline for cloud infrastructure`,
      controls,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [framework.toLowerCase(), 'compliance', 'baseline'],
      metadata: {
        totalControls: controls.length,
        automatedControls: controls.filter(c => c.automated).length,
        generatedFrom: assets.length,
        findingsAddressed: findings.length,
      },
    };

    this.baselines.set(baseline.id, baseline);
    return baseline;
  }

  /**
   * Generate Terraform compliance module
   */
  async generateTerraformComplianceModule(
    baseline: ComplianceBaseline,
    provider: 'aws' | 'azure' | 'gcp'
  ): Promise<TerraformModule> {
    const moduleName = `${baseline.framework.toLowerCase()}-compliance-${provider}`;
    const resources = await this.generateComplianceResources(baseline, provider);
    const variables = await this.generateModuleVariables(resources);
    const outputs = await this.generateModuleOutputs(resources);

    const module: TerraformModule = {
      name: moduleName,
      description: `Terraform module for ${baseline.framework} compliance on ${provider.toUpperCase()}`,
      version: '1.0.0',
      source: `./modules/${moduleName}`,
      variables,
      outputs,
      resources,
      complianceControls: baseline.controls.map(c => c.controlId),
      examples: [
        this.generateTerraformExample(moduleName, variables),
      ],
    };

    this.terraformModules.set(module.name, module);
    return module;
  }

  /**
   * Export compliance baseline to various formats
   */
  exportBaseline(baseline: ComplianceBaseline, format: 'json' | 'yaml' | 'terraform' | 'cloudformation' | 'arm'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(baseline, null, 2);
      
      case 'yaml':
        return this.convertToYAML(baseline);
      
      case 'terraform':
        return this.generateTerraformCode(baseline);
      
      case 'cloudformation':
        return this.generateCloudFormationTemplate(baseline);
      
      case 'arm':
        return this.generateARMTemplate(baseline);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate compliance evidence
   */
  async generateEvidence(
    controlId: string,
    assetId: string,
    evidenceType: ComplianceEvidence['type'],
    content?: string
  ): Promise<ComplianceEvidence> {
    const evidence: ComplianceEvidence = {
      id: `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      controlId,
      assetId,
      type: evidenceType,
      title: `Evidence for ${controlId}`,
      description: `Automated evidence collection for compliance control ${controlId}`,
      content,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.config.evidenceRetentionDays * 24 * 60 * 60 * 1000),
      verified: false,
      metadata: {
        generatedBy: 'compliance-as-code-engine',
        framework: this.getControlFramework(controlId),
      },
    };

    // Store evidence
    const assetEvidence = this.evidence.get(assetId) || [];
    assetEvidence.push(evidence);
    this.evidence.set(assetId, assetEvidence);

    return evidence;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    baseline: ComplianceBaseline,
    assets: Asset[],
    findings: Finding[],
    reportType: ComplianceReport['reportType'] = 'assessment'
  ): Promise<ComplianceReport> {
    const controlResults = await this.assessControls(baseline.controls, assets, findings);
    const summary = this.calculateReportSummary(controlResults);
    const overallScore = this.calculateOverallScore(controlResults);
    const status = this.determineComplianceStatus(overallScore);
    const recommendations = await this.generateComplianceRecommendations(controlResults, findings);
    
    // Collect all evidence
    const allEvidence: ComplianceEvidence[] = [];
    for (const asset of assets) {
      const assetEvidence = this.evidence.get(asset.id) || [];
      allEvidence.push(...assetEvidence);
    }

    const report: ComplianceReport = {
      id: `report-${baseline.framework.toLowerCase()}-${Date.now()}`,
      framework: baseline.framework,
      version: baseline.version,
      reportType,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: new Date(),
      },
      overallScore,
      status,
      summary,
      controlResults,
      evidence: allEvidence,
      recommendations,
      generatedAt: new Date(),
      generatedBy: 'compliance-as-code-engine',
    };

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Generate framework controls
   */
  private async generateFrameworkControls(framework: string): Promise<ComplianceControl[]> {
    const controlGenerators = {
      'CIS': this.generateCISControls.bind(this),
      'SOC2': this.generateSOC2Controls.bind(this),
      'PCI-DSS': this.generatePCIDSSControls.bind(this),
      'NIST': this.generateNISTControls.bind(this),
      'ISO27001': this.generateISO27001Controls.bind(this),
    };

    const generator = controlGenerators[framework as keyof typeof controlGenerators];
    if (!generator) {
      throw new Error(`Unsupported framework: ${framework}`);
    }

    return generator();
  }

  /**
   * Generate CIS AWS Foundations Benchmark controls
   */
  private generateCISControls(): ComplianceControl[] {
    return [
      {
        id: 'cis-1.1',
        controlId: '1.1',
        title: 'Avoid using the root account',
        description: 'The root account should not be used for everyday tasks',
        category: 'Identity and Access Management',
        severity: 'critical',
        implementation: 'Create IAM users with appropriate permissions for daily operations',
        validation: 'Verify root account has MFA enabled and no access keys',
        automated: true,
        evidenceRequired: ['iam_policy', 'mfa_status'],
        mappings: {
          nist: 'AC-2',
          iso27001: 'A.9.2.1',
          soc2: 'CC6.1',
        },
      },
      {
        id: 'cis-1.2',
        controlId: '1.2',
        title: 'Enable MFA for all IAM users',
        description: 'Multi-factor authentication should be enabled for all IAM users',
        category: 'Identity and Access Management',
        severity: 'high',
        implementation: 'Enable MFA for all IAM users with console access',
        validation: 'Check MFA status for all IAM users',
        automated: true,
        evidenceRequired: ['iam_user_mfa_status'],
        mappings: {
          nist: 'AC-2',
          iso27001: 'A.9.2.3',
          soc2: 'CC6.1',
        },
      },
      {
        id: 'cis-2.1',
        controlId: '2.1',
        title: 'Enable S3 bucket encryption',
        description: 'S3 buckets should have encryption enabled',
        category: 'Storage',
        severity: 'high',
        implementation: 'Enable server-side encryption for all S3 buckets',
        validation: 'Verify encryption configuration for S3 buckets',
        automated: true,
        evidenceRequired: ['s3_bucket_encryption'],
        mappings: {
          nist: 'SC-12',
          iso27001: 'A.8.2.3',
          soc2: 'CC6.1',
        },
      },
    ];
  }

  /**
   * Generate SOC2 controls
   */
  private generateSOC2Controls(): ComplianceControl[] {
    return [
      {
        id: 'soc2-cc1.1',
        controlId: 'CC1.1',
        title: 'Control Environment',
        description: 'Management establishes structures, reporting lines, and authorities to communicate information',
        category: 'Control Environment',
        severity: 'medium',
        implementation: 'Establish governance framework and communication channels',
        validation: 'Review organizational charts and governance documents',
        automated: false,
        evidenceRequired: ['organizational_chart', 'governance_policy'],
        mappings: {
          nist: 'CM-1',
          iso27001: 'A.5.1',
        },
      },
      {
        id: 'soc2-cc6.1',
        controlId: 'CC6.1',
        title: 'Logical and Physical Access Controls',
        description: 'Logical access controls safeguard against threats',
        category: 'Access Controls',
        severity: 'critical',
        implementation: 'Implement IAM policies and access controls',
        validation: 'Review IAM policies and access logs',
        automated: true,
        evidenceRequired: ['iam_policies', 'access_logs'],
        mappings: {
          nist: 'AC-2',
          iso27001: 'A.9.2.1',
        },
      },
    ];
  }

  /**
   * Generate PCI-DSS controls
   */
  private generatePCIDSSControls(): ComplianceControl[] {
    return [
      {
        id: 'pci-1.1',
        controlId: '1.1',
        title: 'Firewall Configuration',
        description: 'Establish and implement firewall configuration standards',
        category: 'Network Security',
        severity: 'critical',
        implementation: 'Configure network firewalls and security groups',
        validation: 'Review firewall rules and network configurations',
        automated: true,
        evidenceRequired: ['firewall_rules', 'network_configuration'],
        mappings: {
          nist: 'SC-7',
          iso27001: 'A.13.1.1',
        },
      },
      {
        id: 'pci-3.1',
        controlId: '3.1',
        title: 'Protect Cardholder Data',
        description: 'Protect stored cardholder data',
        category: 'Data Protection',
        severity: 'critical',
        implementation: 'Implement encryption and access controls for cardholder data',
        validation: 'Verify encryption and access control implementations',
        automated: true,
        evidenceRequired: ['encryption_configuration', 'access_controls'],
        mappings: {
          nist: 'SC-12',
          iso27001: 'A.8.2.3',
        },
      },
    ];
  }

  /**
   * Generate NIST controls
   */
  private generateNISTControls(): ComplianceControl[] {
    return [
      {
        id: 'nist-ac-2',
        controlId: 'AC-2',
        title: 'Account Management',
        description: 'Manage information system accounts and authenticated identifiers',
        category: 'Access Control',
        severity: 'high',
        implementation: 'Implement account lifecycle management',
        validation: 'Review account creation, modification, and termination processes',
        automated: true,
        evidenceRequired: ['iam_policies', 'account_logs'],
        mappings: {
          iso27001: 'A.9.2.1',
          soc2: 'CC6.1',
        },
      },
      {
        id: 'nist-sc-12',
        controlId: 'SC-12',
        title: 'Cryptographic Protection',
        description: 'Establish and implement cryptographic protection',
        category: 'System and Communications Protection',
        severity: 'high',
        implementation: 'Implement encryption for data at rest and in transit',
        validation: 'Verify encryption implementations',
        automated: true,
        evidenceRequired: ['encryption_configuration'],
        mappings: {
          iso27001: 'A.8.2.3',
          soc2: 'CC6.1',
        },
      },
    ];
  }

  /**
   * Generate ISO 27001 controls
   */
  private generateISO27001Controls(): ComplianceControl[] {
    return [
      {
        id: 'iso-a.9.2.1',
        controlId: 'A.9.2.1',
        title: 'User Registration and Deregistration',
        description: 'Formal user registration and deregistration process',
        category: 'Access Control',
        severity: 'high',
        implementation: 'Implement user lifecycle management processes',
        validation: 'Review user registration and deregistration procedures',
        automated: true,
        evidenceRequired: ['user_management_policies', 'access_logs'],
        mappings: {
          nist: 'AC-2',
          soc2: 'CC6.1',
        },
      },
      {
        id: 'iso-a.8.2.3',
        controlId: 'A.8.2.3',
        title: 'Information Handling',
        description: 'Procedures for handling information',
        category: 'Information Security',
        severity: 'medium',
        implementation: 'Implement information classification and handling procedures',
        validation: 'Review information handling procedures',
        automated: false,
        evidenceRequired: ['information_classification_policy'],
        mappings: {
          nist: 'SC-12',
          soc2: 'CC6.1',
        },
      },
    ];
  }

  /**
   * Generate Terraform resources for compliance
   */
  private async generateComplianceResources(
    baseline: ComplianceBaseline,
    provider: 'aws' | 'azure' | 'gcp'
  ): Promise<TerraformResource[]> {
    const resources: TerraformResource[] = [];

    for (const control of baseline.controls) {
      if (!control.automated) continue;

      const controlResources = this.generateControlResources(control, provider);
      resources.push(...controlResources);
    }

    return resources;
  }

  /**
   * Generate resources for a specific control
   */
  private generateControlResources(
    control: ComplianceControl,
    provider: 'aws' | 'azure' | 'gcp'
  ): TerraformResource[] {
    const resources: TerraformResource[] = [];

    switch (provider) {
      case 'aws':
        resources.push(...this.generateAWSResources(control));
        break;
      case 'azure':
        resources.push(...this.generateAzureResources(control));
        break;
      case 'gcp':
        resources.push(...this.generateGCPResources(control));
        break;
    }

    return resources;
  }

  /**
   * Generate AWS resources for compliance
   */
  private generateAWSResources(control: ComplianceControl): TerraformResource[] {
    const resources: TerraformResource[] = [];

    if (control.controlId.includes('1.1') || control.controlId.includes('MFA')) {
      resources.push({
        type: 'aws_iam_policy',
        name: 'mfa-required-policy',
        properties: {
          name: 'MFARequiredPolicy',
          description: 'Policy requiring MFA for console access',
          policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Deny',
                NotAction: 'iam:*',
                Resource: '*',
                Condition: {
                  BoolIfExists: {
                    'aws:MultiFactorAuthPresent': 'false',
                  },
                },
              },
            ],
          }),
        },
        complianceTags: [control.controlId, 'mfa', 'security'],
      });
    }

    if (control.controlId.includes('2.1') || control.controlId.includes('encryption')) {
      resources.push({
        type: 'aws_s3_bucket_server_side_encryption_configuration',
        name: 's3-encryption',
        properties: {
          bucket: 'aws_s3_bucket.example.bucket',
          rule: {
            apply_server_side_encryption_by_default: {
              sse_algorithm: 'AES256',
            },
          },
        },
        complianceTags: [control.controlId, 'encryption', 's3'],
      });
    }

    return resources;
  }

  /**
   * Generate Azure resources for compliance
   */
  private generateAzureResources(control: ComplianceControl): TerraformResource[] {
    const resources: TerraformResource[] = [];

    if (control.controlId.includes('MFA')) {
      resources.push({
        type: 'azurerm_storage_account',
        name: 'secure-storage',
        properties: {
          name: 'securestorageaccount',
          account_tier: 'Standard',
          account_replication_type: 'LRS',
          min_tls_version: 'TLS1_2',
          https_traffic_only: true,
          allow_shared_key_access: false,
        },
        complianceTags: [control.controlId, 'mfa', 'security'],
      });
    }

    return resources;
  }

  /**
   * Generate GCP resources for compliance
   */
  private generateGCPResources(control: ComplianceControl): TerraformResource[] {
    const resources: TerraformResource[] = [];

    if (control.controlId.includes('encryption')) {
      resources.push({
        type: 'google_storage_bucket',
        name: 'secure-bucket',
        properties: {
          name: 'secure-bucket',
          location: 'US',
          storage_class: 'STANDARD',
          encryption: {
            default_kms_key_name: 'google_kms_crypto_key.example.id',
          },
          uniform_bucket_level_access: true,
        },
        complianceTags: [control.controlId, 'encryption', 'storage'],
      });
    }

    return resources;
  }

  /**
   * Generate Terraform variables
   */
  private async generateModuleVariables(resources: TerraformResource[]): Promise<TerraformVariable[]> {
    const variables: TerraformVariable[] = [
      {
        name: 'environment',
        type: 'string',
        description: 'Environment name (e.g., dev, staging, prod)',
        required: true,
        sensitive: false,
      },
      {
        name: 'region',
        type: 'string',
        description: 'AWS region for resources',
        default: 'us-east-1',
        required: false,
        sensitive: false,
      },
      {
        name: 'enable_encryption',
        type: 'bool',
        description: 'Enable encryption for storage resources',
        default: true,
        required: false,
        sensitive: false,
      },
    ];

    return variables;
  }

  /**
   * Generate Terraform outputs
   */
  private async generateModuleOutputs(resources: TerraformResource[]): Promise<TerraformOutput[]> {
    const outputs: TerraformOutput[] = [
      {
        name: 'compliance_score',
        description: 'Overall compliance score',
        value: 'module.compliance.score',
        sensitive: false,
      },
      {
        name: 'compliant_resources',
        description: 'List of compliant resources',
        value: 'module.compliance.compliant_resources',
        sensitive: false,
      },
    ];

    return outputs;
  }

  /**
   * Generate Terraform example
   */
  private generateTerraformExample(moduleName: string, variables: TerraformVariable[]): string {
    const variableInputs = variables
      .filter(v => v.required)
      .map(v => `  ${v.name} = var.${v.name}`)
      .join('\n');

    return `
module "${moduleName}" {
  source = "./modules/${moduleName}"
  
${variableInputs}
}

# Required variables
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
`;
  }

  /**
   * Convert baseline to YAML
   */
  private convertToYAML(baseline: ComplianceBaseline): string {
    // Simplified YAML conversion - in real implementation would use proper YAML library
    return `
apiVersion: compliance/v1
kind: Baseline
metadata:
  name: ${baseline.name}
  id: ${baseline.id}
  framework: ${baseline.framework}
  version: ${baseline.version}
  createdAt: ${baseline.createdAt.toISOString()}
  updatedAt: ${baseline.updatedAt.toISOString()}
  tags: ${JSON.stringify(baseline.tags)}
spec:
  description: ${baseline.description}
  controls: ${JSON.stringify(baseline.controls, null, 2)}
`;
  }

  /**
   * Generate Terraform code
   */
  private generateTerraformCode(baseline: ComplianceBaseline): string {
    let terraform = `
# ${baseline.framework} Compliance Baseline
# Generated: ${new Date().toISOString()}
# Version: ${baseline.version}

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# Variables
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Compliance Resources
`;

    for (const control of baseline.controls) {
      if (control.automated) {
        terraform += `
# ${control.controlId}: ${control.title}
# ${control.description}
resource "aws_iam_policy" "${control.controlId}_policy" {
  name = "${control.controlId}-compliance-policy"
  description = "${control.description}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = var.region
          }
        }
      }
    ]
  })

  tags = {
    Compliance = "${baseline.framework}"
    Control = "${control.controlId}"
    Environment = var.environment
  }
}
`;
      }
    }

    return terraform;
  }

  /**
   * Generate CloudFormation template
   */
  private generateCloudFormationTemplate(baseline: ComplianceBaseline): string {
    return `
AWSTemplateFormatVersion: '2010-09-09'
Description: '${baseline.framework} Compliance Baseline - ${baseline.version}'

Parameters:
  Environment:
    Type: String
    Description: Environment name
    Default: development

  Region:
    Type: String
    Description: AWS region
    Default: us-east-1

Resources:
${baseline.controls.filter(c => c.automated).map(control => `
  ${control.controlId}CompliancePolicy:
    Type: AWS::IAM::ManagedPolicy
    Properties:
      Description: "${control.description}"
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Deny
            Action: '*'
            Resource: '*'
            Condition:
              StringNotEquals:
                aws:RequestedRegion: !Ref Region
      Tags:
        - Key: Compliance
          Value: ${baseline.framework}
        - Key: Control
          Value: ${control.controlId}
        - Key: Environment
          Value: !Ref Environment
`).join('')}

Outputs:
  ComplianceScore:
    Description: Overall compliance score
    Value: 100
`;
  }

  /**
   * Generate ARM template
   */
  private generateARMTemplate(baseline: ComplianceBaseline): string {
    return `
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "description": "${baseline.framework} Compliance Baseline - ${baseline.version}",
  "parameters": {
    "environment": {
      "type": "string",
      "defaultValue": "development",
      "metadata": {
        "description": "Environment name"
      }
    }
  },
  "resources": [
${baseline.controls.filter(c => c.automated).map(control => `
    {
      "type": "Microsoft.Authorization/policyDefinitions",
      "apiVersion": "2021-06-01",
      "name": "${control.controlId}-policy",
      "properties": {
        "displayName": "${control.title}",
        "description": "${control.description}",
        "policyRule": {
          "if": {
            "field": "type",
            "equals": "Microsoft.Storage/storageAccounts"
          },
          "then": {
            "effect": "deny"
          }
        }
      }
    }`).join(',')}
  ],
  "outputs": {
    "complianceScore": {
      "type": "integer",
      "value": 100
    }
  }
}
`;
  }

  /**
   * Assess controls against assets and findings
   */
  private async assessControls(
    controls: ComplianceControl[],
    assets: Asset[],
    findings: Finding[]
  ): Promise<ControlResult[]> {
    const results: ControlResult[] = [];

    for (const control of controls) {
      const result = await this.assessSingleControl(control, assets, findings);
      results.push(result);
    }

    return results;
  }

  /**
   * Assess a single control
   */
  private async assessSingleControl(
    control: ComplianceControl,
    assets: Asset[],
    findings: Finding[]
  ): Promise<ControlResult> {
    const controlFindings = findings.filter(f => 
      f.compliance?.some(c => c.control === control.controlId)
    );

    const isCompliant = controlFindings.length === 0;
    const score = isCompliant ? 100 : Math.max(0, 100 - (controlFindings.length * 20));

    // Get evidence for this control
    const allEvidence: ComplianceEvidence[] = [];
    for (const asset of assets) {
      const assetEvidence = this.evidence.get(asset.id) || [];
      allEvidence.push(...assetEvidence.filter(e => e.controlId === control.controlId));
    }

    return {
      controlId: control.controlId,
      status: isCompliant ? 'compliant' : 'non_compliant',
      score,
      findings: controlFindings,
      evidence: allEvidence,
      lastAssessed: new Date(),
    };
  }

  /**
   * Calculate report summary
   */
  private calculateReportSummary(controlResults: ControlResult[]): ComplianceReport['summary'] {
    const summary = {
      totalControls: controlResults.length,
      compliantControls: controlResults.filter(r => r.status === 'compliant').length,
      nonCompliantControls: controlResults.filter(r => r.status === 'non_compliant').length,
      notApplicableControls: controlResults.filter(r => r.status === 'not_applicable').length,
      criticalFindings: 0,
      highFindings: 0,
      mediumFindings: 0,
      lowFindings: 0,
    };

    for (const result of controlResults) {
      for (const finding of result.findings) {
        switch (finding.severity) {
          case 'critical':
            summary.criticalFindings++;
            break;
          case 'high':
            summary.highFindings++;
            break;
          case 'medium':
            summary.mediumFindings++;
            break;
          case 'low':
            summary.lowFindings++;
            break;
        }
      }
    }

    return summary;
  }

  /**
   * Calculate overall compliance score
   */
  private calculateOverallScore(controlResults: ControlResult[]): number {
    if (controlResults.length === 0) return 0;

    const totalScore = controlResults.reduce((sum, result) => sum + result.score, 0);
    return Math.round(totalScore / controlResults.length);
  }

  /**
   * Determine compliance status
   */
  private determineComplianceStatus(score: number): ComplianceReport['status'] {
    if (score >= 95) return 'compliant';
    if (score >= 80) return 'partial_compliance';
    return 'non_compliant';
  }

  /**
   * Generate compliance recommendations
   */
  private async generateComplianceRecommendations(
    controlResults: ControlResult[],
    findings: Finding[]
  ): Promise<ComplianceRecommendation[]> {
    const recommendations: ComplianceRecommendation[] = [];

    for (const result of controlResults) {
      if (result.status === 'non_compliant') {
        const recommendation = this.generateControlRecommendation(result, findings);
        recommendations.push(recommendation);
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate recommendation for a control
   */
  private generateControlRecommendation(result: ControlResult, findings: Finding[]): ComplianceRecommendation {
    const priority = result.findings.some(f => f.severity === 'critical') ? 'critical' :
                    result.findings.some(f => f.severity === 'high') ? 'high' : 'medium';

    return {
      id: `rec-${result.controlId}-${Date.now()}`,
      controlId: result.controlId,
      priority,
      title: `Remediate ${result.controlId} compliance issues`,
      description: `Address the ${result.findings.length} findings for control ${result.controlId}`,
      implementationSteps: [
        'Review the identified findings',
        'Implement the required security controls',
        'Verify the implementation',
        'Collect evidence of compliance',
      ],
      estimatedEffort: Math.max(1, result.findings.length * 2),
      dependencies: [],
      riskReduction: Math.min(100, result.findings.length * 15),
      costImpact: 'medium',
    };
  }

  /**
   * Get control framework
   */
  private getControlFramework(controlId: string): string {
    if (controlId.startsWith('cis-')) return 'CIS';
    if (controlId.startsWith('soc2-')) return 'SOC2';
    if (controlId.startsWith('pci-')) return 'PCI-DSS';
    if (controlId.startsWith('nist-')) return 'NIST';
    if (controlId.startsWith('iso-')) return 'ISO27001';
    return 'Unknown';
  }

  /**
   * Initialize default baselines
   */
  private initializeDefaultBaselines(): void {
    // Baselines will be generated on-demand
  }

  /**
   * Get all baselines
   */
  getBaselines(): ComplianceBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Get baseline by ID
   */
  getBaseline(id: string): ComplianceBaseline | undefined {
    return this.baselines.get(id);
  }

  /**
   * Get all reports
   */
  getReports(): ComplianceReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Get report by ID
   */
  getReport(id: string): ComplianceReport | undefined {
    return this.reports.get(id);
  }

  /**
   * Get Terraform modules
   */
  getTerraformModules(): TerraformModule[] {
    return Array.from(this.terraformModules.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ComplianceAsCodeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ComplianceAsCodeConfig {
    return { ...this.config };
  }
}
