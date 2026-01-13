import { Finding } from '../schemas/finding';
import { Asset } from '../schemas/asset';

export interface ContainerAsset extends Asset {
  type: 'container' | 'kubernetes' | 'docker' | 'ecs' | 'eks' | 'aks' | 'gke';
  containerRuntime: 'docker' | 'containerd' | 'cri-o';
  orchestrator?: 'kubernetes' | 'ecs' | 'fargate';
  image: ContainerImage;
  securityContext: ContainerSecurityContext;
  networkPolicy: NetworkPolicy;
  resources: ContainerResources;
  volumes: ContainerVolume[];
  environment: ContainerEnvironment;
}

export interface ServerlessAsset extends Asset {
  type: 'lambda' | 'function' | 'cloud-function' | 'azure-function' | 'logic-app';
  runtime: string;
  handler: string;
  timeout: number;
  memory: number;
  environment: ServerlessEnvironment;
  permissions: ServerlessPermissions;
  triggers: ServerlessTrigger[];
  layers: ServerlessLayer[];
  vpcConfig?: ServerlessVPCConfig;
}

export interface ContainerImage {
  name: string;
  tag: string;
  digest?: string;
  registry: string;
  size: number;
  vulnerabilities: ImageVulnerability[];
  secrets: ImageSecret[];
  baseImage: string;
  buildDate?: Date;
  author?: string;
}

export interface ImageVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  package: string;
  version: string;
  fixedVersion?: string;
  cve?: string;
  cvss?: number;
  references: string[];
}

export interface ImageSecret {
  type: 'password' | 'api_key' | 'certificate' | 'token';
  value: string;
  location: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface ContainerSecurityContext {
  runAsUser?: number;
  runAsGroup?: number;
  runAsNonRoot: boolean;
  readOnlyRootFilesystem: boolean;
  allowPrivilegeEscalation: boolean;
  capabilities: {
    add: string[];
    drop: string[];
  };
  seccompProfile?: string;
  appArmorProfile?: string;
}

export interface NetworkPolicy {
  enabled: boolean;
  ingressRules: NetworkRule[];
  egressRules: NetworkRule[];
  defaultPolicy: 'allow' | 'deny';
}

export interface NetworkRule {
  from?: string[];
  to?: string[];
  ports: Port[];
  protocols: ('TCP' | 'UDP' | 'SCTP')[];
}

export interface Port {
  port: number;
  endPort?: number;
  protocol: 'TCP' | 'UDP';
}

export interface ContainerResources {
  requests: {
    cpu: string;
    memory: string;
  };
  limits: {
    cpu: string;
    memory: string;
  };
  ephemeralStorage?: string;
}

export interface ContainerVolume {
  name: string;
  type: 'configMap' | 'secret' | 'persistentVolumeClaim' | 'emptyDir' | 'hostPath';
  mountPath: string;
  readOnly: boolean;
  source: string;
}

export interface ContainerEnvironment {
  variables: Record<string, string>;
  secrets: Record<string, string>;
  configMaps: Record<string, string>;
}

export interface ServerlessEnvironment {
  variables: Record<string, string>;
  secrets: Record<string, string>;
  kmsKey?: string;
}

export interface ServerlessPermissions {
  role: string;
  policies: string[];
  managedPolicies: string[];
  inlinePolicies: Record<string, any>;
}

export interface ServerlessTrigger {
  type: 'api_gateway' | 's3' | 'dynamodb' | 'sns' | 'sqs' | 'eventbridge' | 'schedule';
  source: string;
  configuration: Record<string, any>;
  authentication?: string;
}

export interface ServerlessLayer {
  name: string;
  version: number;
  arn: string;
  size: number;
  compatibleRuntimes: string[];
  license?: string;
}

export interface ServerlessVPCConfig {
  securityGroupIds: string[];
  subnetIds: string[];
  vpcId: string;
  ipv6AllowedForDualStack?: boolean;
}

export interface ContainerSecurityFinding extends Finding {
  containerContext: {
    image: string;
    runtime: string;
    orchestrator?: string;
    namespace?: string;
    podName?: string;
    nodeName?: string;
  };
  vulnerabilityDetails?: ImageVulnerability;
  secretDetails?: ImageSecret;
}

export interface ServerlessSecurityFinding extends Finding {
  serverlessContext: {
    functionName: string;
    runtime: string;
    region: string;
    triggerTypes: string[];
    vpcEnabled: boolean;
  };
  permissionDetails?: {
    overprivileged: boolean;
    excessivePermissions: string[];
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
  };
}

export interface ContainerServerlessConfig {
  enableVulnerabilityScanning: boolean;
  enableSecretScanning: boolean;
  enableRuntimeSecurity: boolean;
  enableNetworkPolicyAnalysis: boolean;
  enablePermissionAnalysis: boolean;
  vulnerabilityDatabase: 'nist' | 'cve' | 'github' | 'custom';
  maxImageSize: number; // MB
  maxLayers: number;
  scanTimeout: number; // seconds
}

export class ContainerServerlessContextEngine {
  private config: ContainerServerlessConfig;
  private vulnerabilityCache: Map<string, ImageVulnerability[]> = new Map();
  private secretCache: Map<string, ImageSecret[]> = new Map();
  private runtimeSecurityEvents: Map<string, any[]> = new Map();

  constructor(config?: Partial<ContainerServerlessConfig>) {
    this.config = {
      enableVulnerabilityScanning: true,
      enableSecretScanning: true,
      enableRuntimeSecurity: true,
      enableNetworkPolicyAnalysis: true,
      enablePermissionAnalysis: true,
      vulnerabilityDatabase: 'cve',
      maxImageSize: 2048, // 2GB
      maxLayers: 100,
      scanTimeout: 300, // 5 minutes
      ...config,
    };
  }

  /**
   * Analyze container security
   */
  async analyzeContainerSecurity(container: ContainerAsset): Promise<ContainerSecurityFinding[]> {
    const findings: ContainerSecurityFinding[] = [];

    // Image vulnerability scanning
    if (this.config.enableVulnerabilityScanning) {
      const vulnerabilityFindings = await this.scanImageVulnerabilities(container);
      findings.push(...vulnerabilityFindings);
    }

    // Secret scanning
    if (this.config.enableSecretScanning) {
      const secretFindings = await this.scanImageSecrets(container);
      findings.push(...secretFindings);
    }

    // Security context analysis
    const contextFindings = this.analyzeSecurityContext(container);
    findings.push(...contextFindings);

    // Network policy analysis
    if (this.config.enableNetworkPolicyAnalysis) {
      const networkFindings = this.analyzeNetworkPolicy(container);
      findings.push(...networkFindings);
    }

    // Resource configuration analysis
    const resourceFindings = this.analyzeContainerResources(container);
    findings.push(...resourceFindings);

    return findings;
  }

  /**
   * Analyze serverless security
   */
  async analyzeServerlessSecurity(serverless: ServerlessAsset): Promise<ServerlessSecurityFinding[]> {
    const findings: ServerlessSecurityFinding[] = [];

    // Permission analysis
    if (this.config.enablePermissionAnalysis) {
      const permissionFindings = await this.analyzeServerlessPermissions(serverless);
      findings.push(...permissionFindings);
    }

    // Environment variable analysis
    const envFindings = this.analyzeServerlessEnvironment(serverless);
    findings.push(...envFindings);

    // Trigger security analysis
    const triggerFindings = this.analyzeServerlessTriggers(serverless);
    findings.push(...triggerFindings);

    // VPC configuration analysis
    const vpcFindings = this.analyzeServerlessVPC(serverless);
    findings.push(...vpcFindings);

    // Layer security analysis
    const layerFindings = await this.analyzeServerlessLayers(serverless);
    findings.push(...layerFindings);

    return findings;
  }

  /**
   * Scan container image for vulnerabilities
   */
  private async scanImageVulnerabilities(container: ContainerAsset): Promise<ContainerSecurityFinding[]> {
    const findings: ContainerSecurityFinding[] = [];
    const imageKey = `${container.image.registry}/${container.image.name}:${container.image.tag}`;

    let vulnerabilities = this.vulnerabilityCache.get(imageKey);
    if (!vulnerabilities) {
      vulnerabilities = await this.fetchVulnerabilities(container.image);
      this.vulnerabilityCache.set(imageKey, vulnerabilities);
    }

    for (const vulnerability of vulnerabilities) {
      const finding: ContainerSecurityFinding = {
        id: `container-vuln-${container.id}-${vulnerability.id}`,
        rule: 'container-image-vulnerability',
        title: `Container Image Vulnerability: ${vulnerability.title}`,
        description: vulnerability.description,
        severity: vulnerability.severity,
        assetId: container.id,
        provider: container.provider,
        service: container.service,
        region: container.region,
        compliance: this.mapVulnerabilityToCompliance(vulnerability),
        remediation: {
          description: `Update ${vulnerability.package} to version ${vulnerability.fixedVersion || 'latest'}`,
          code: this.generateRemediationCode(container, vulnerability),
        },
        cvss: vulnerability.cvss ? {
          attackVector: 'network',
          attackComplexity: 'low',
          privilegesRequired: 'none',
          userInteraction: 'none',
          scope: 'unchanged',
          confidentialityImpact: vulnerability.severity === 'critical' ? 'high' : 'medium',
          integrityImpact: vulnerability.severity === 'critical' ? 'high' : 'low',
          availabilityImpact: 'none',
        } : undefined,
        containerContext: {
          image: container.image.name,
          runtime: container.containerRuntime,
          orchestrator: container.orchestrator,
        },
        vulnerabilityDetails: vulnerability,
      };

      findings.push(finding);
    }

    return findings;
  }

  /**
   * Scan container image for secrets
   */
  private async scanImageSecrets(container: ContainerAsset): Promise<ContainerSecurityFinding[]> {
    const findings: ContainerSecurityFinding[] = [];
    const imageKey = `${container.image.registry}/${container.image.name}:${container.image.tag}`;

    let secrets = this.secretCache.get(imageKey);
    if (!secrets) {
      secrets = await this.fetchSecrets(container.image);
      this.secretCache.set(imageKey, secrets);
    }

    for (const secret of secrets) {
      const finding: ContainerSecurityFinding = {
        id: `container-secret-${container.id}-${secret.type}-${secret.location}`,
        rule: 'container-image-secret',
        title: `Secret Found in Container Image: ${secret.type}`,
        description: `Potential ${secret.type} found at ${secret.location}: ${secret.description}`,
        severity: secret.severity,
        assetId: container.id,
        provider: container.provider,
        service: container.service,
        region: container.region,
        compliance: [
          { framework: 'CIS', control: '5.1.5' },
          { framework: 'NIST', control: 'SC-13' },
        ],
        remediation: {
          description: 'Remove hardcoded secrets from container image and use secret management',
          code: `# Remove secret from ${secret.location}\n# Use environment variables or secret management\nkubectl create secret generic app-secret --from-literal=key=value`,
        },
        containerContext: {
          image: container.image.name,
          runtime: container.containerRuntime,
          orchestrator: container.orchestrator,
        },
        secretDetails: secret,
      };

      findings.push(finding);
    }

    return findings;
  }

  /**
   * Analyze container security context
   */
  private analyzeSecurityContext(container: ContainerAsset): ContainerSecurityFinding[] {
    const findings: ContainerSecurityFinding[] = [];
    const context = container.securityContext;

    // Check for privileged containers
    if (!context.runAsNonRoot) {
      findings.push({
        id: `container-privileged-${container.id}`,
        rule: 'container-running-as-root',
        title: 'Container Running as Root User',
        description: 'Container is configured to run as root user, which violates security best practices',
        severity: 'high',
        assetId: container.id,
        provider: container.provider,
        service: container.service,
        region: container.region,
        compliance: [
          { framework: 'CIS', control: '5.2.6' },
          { framework: 'NIST', control: 'AC-3' },
        ],
        remediation: {
          description: 'Configure container to run as non-root user',
          code: `securityContext:\n  runAsNonRoot: true\n  runAsUser: 1000`,
        },
        containerContext: {
          image: container.image.name,
          runtime: container.containerRuntime,
          orchestrator: container.orchestrator,
        },
      });
    }

    // Check for privilege escalation
    if (context.allowPrivilegeEscalation) {
      findings.push({
        id: `container-privilege-escalation-${container.id}`,
        rule: 'container-privilege-escalation-allowed',
        title: 'Container Allows Privilege Escalation',
        description: 'Container allows privilege escalation, which could lead to container breakout',
        severity: 'high',
        assetId: container.id,
        provider: container.provider,
        service: container.service,
        region: container.region,
        compliance: [
          { framework: 'CIS', control: '5.2.8' },
          { framework: 'NIST', control: 'AC-3' },
        ],
        remediation: {
          description: 'Disable privilege escalation in container security context',
          code: `securityContext:\n  allowPrivilegeEscalation: false`,
        },
        containerContext: {
          image: container.image.name,
          runtime: container.containerRuntime,
          orchestrator: container.orchestrator,
        },
      });
    }

    // Check for writable root filesystem
    if (!context.readOnlyRootFilesystem) {
      findings.push({
        id: `container-writable-root-${container.id}`,
        rule: 'container-writable-root-filesystem',
        title: 'Container Has Writable Root Filesystem',
        description: 'Container root filesystem is writable, which could allow malicious modifications',
        severity: 'medium',
        assetId: container.id,
        provider: container.provider,
        service: container.service,
        region: container.region,
        compliance: [
          { framework: 'CIS', control: '5.2.9' },
          { framework: 'NIST', control: 'CM-7' },
        ],
        remediation: {
          description: 'Make container root filesystem read-only',
          code: `securityContext:\n  readOnlyRootFilesystem: true\n  # Use emptyDir for temporary writable storage\n  volumeMounts:\n  - name: tmp\n    mountPath: /tmp`,
        },
        containerContext: {
          image: container.image.name,
          runtime: container.containerRuntime,
          orchestrator: container.orchestrator,
        },
      });
    }

    // Check for excessive capabilities
    if (context.capabilities.add.length > 0) {
      findings.push({
        id: `container-capabilities-${container.id}`,
        rule: 'container-excessive-capabilities',
        title: 'Container Has Excessive Capabilities',
        description: `Container has added capabilities: ${context.capabilities.add.join(', ')}`,
        severity: 'medium',
        assetId: container.id,
        provider: container.provider,
        service: container.service,
        region: container.region,
        compliance: [
          { framework: 'CIS', control: '5.2.10' },
          { framework: 'NIST', control: 'AC-3' },
        ],
        remediation: {
          description: 'Remove unnecessary capabilities from container',
          code: `securityContext:\n  capabilities:\n    drop:\n    - ALL\n    add: []`,
        },
        containerContext: {
          image: container.image.name,
          runtime: container.containerRuntime,
          orchestrator: container.orchestrator,
        },
      });
    }

    return findings;
  }

  /**
   * Analyze network policies
   */
  private analyzeNetworkPolicy(container: ContainerAsset): ContainerSecurityFinding[] {
    const findings: ContainerSecurityFinding[] = [];
    const policy = container.networkPolicy;

    if (!policy.enabled) {
      findings.push({
        id: `container-no-network-policy-${container.id}`,
        rule: 'container-no-network-policy',
        title: 'Container Has No Network Policy',
        description: 'Container lacks network policy, allowing unrestricted network access',
        severity: 'high',
        assetId: container.id,
        provider: container.provider,
        service: container.service,
        region: container.region,
        compliance: [
          { framework: 'CIS', control: '5.3.1' },
          { framework: 'NIST', control: 'SC-7' },
        ],
        remediation: {
          description: 'Implement network policies to restrict container network access',
          code: `apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: ${container.name}-policy\nspec:\n  podSelector:\n    matchLabels:\n      app: ${container.name}\n  policyTypes:\n  - Ingress\n  - Egress\n  ingress:\n  - from:\n    - podSelector:\n        matchLabels:\n          app: frontend\n  egress:\n  - to:\n    - podSelector:\n        matchLabels:\n          app: database`,
        },
        containerContext: {
          image: container.image.name,
          runtime: container.containerRuntime,
          orchestrator: container.orchestrator,
        },
      });
    }

    if (policy.defaultPolicy === 'allow') {
      findings.push({
        id: `container-default-allow-policy-${container.id}`,
        rule: 'container-default-allow-network-policy',
        title: 'Container Uses Default Allow Network Policy',
        description: 'Network policy defaults to allow, which is not secure',
        severity: 'medium',
        assetId: container.id,
        provider: container.provider,
        service: container.service,
        region: container.region,
        compliance: [
          { framework: 'CIS', control: '5.3.2' },
          { framework: 'NIST', control: 'SC-7' },
        ],
        remediation: {
          description: 'Change default network policy to deny',
          code: `spec:\n  policyTypes:\n  - Ingress\n  - Egress\n  ingress: []\n  egress: []`,
        },
        containerContext: {
          image: container.image.name,
          runtime: container.containerRuntime,
          orchestrator: container.orchestrator,
        },
      });
    }

    return findings;
  }

  /**
   * Analyze container resources
   */
  private analyzeContainerResources(container: ContainerAsset): ContainerSecurityFinding[] {
    const findings: ContainerSecurityFinding[] = [];
    const resources = container.resources;

    // Check for unlimited resources
    if (!resources.limits.cpu || resources.limits.cpu === '0') {
      findings.push({
        id: `container-unlimited-cpu-${container.id}`,
        rule: 'container-unlimited-cpu-limits',
        title: 'Container Has No CPU Limits',
        description: 'Container lacks CPU limits, which could lead to resource exhaustion',
        severity: 'medium',
        assetId: container.id,
        provider: container.provider,
        service: container.service,
        region: container.region,
        compliance: [
          { framework: 'CIS', control: '5.2.4' },
          { framework: 'NIST', control: 'SC-6' },
        ],
        remediation: {
          description: 'Set CPU limits for container',
          code: `resources:\n  limits:\n    cpu: "500m"\n    memory: "512Mi"`,
        },
        containerContext: {
          image: container.image.name,
          runtime: container.containerRuntime,
          orchestrator: container.orchestrator,
        },
      });
    }

    if (!resources.limits.memory || resources.limits.memory === '0') {
      findings.push({
        id: `container-unlimited-memory-${container.id}`,
        rule: 'container-unlimited-memory-limits',
        title: 'Container Has No Memory Limits',
        description: 'Container lacks memory limits, which could lead to resource exhaustion',
        severity: 'medium',
        assetId: container.id,
        provider: container.provider,
        service: container.service,
        region: container.region,
        compliance: [
          { framework: 'CIS', control: '5.2.4' },
          { framework: 'NIST', control: 'SC-6' },
        ],
        remediation: {
          description: 'Set memory limits for container',
          code: `resources:\n  limits:\n    cpu: "500m"\n    memory: "512Mi"`,
        },
        containerContext: {
          image: container.image.name,
          runtime: container.containerRuntime,
          orchestrator: container.orchestrator,
        },
      });
    }

    return findings;
  }

  /**
   * Analyze serverless permissions
   */
  private async analyzeServerlessPermissions(serverless: ServerlessAsset): Promise<ServerlessSecurityFinding[]> {
    const findings: ServerlessSecurityFinding[] = [];
    const permissions = serverless.permissions;

    // Check for overprivileged roles
    const overprivilegedPermissions = this.checkOverprivilegedPermissions(permissions);
    if (overprivilegedPermissions.length > 0) {
      findings.push({
        id: `serverless-overprivileged-${serverless.id}`,
        rule: 'serverless-overprivileged-permissions',
        title: 'Serverless Function Has Overprivileged Permissions',
        description: `Function has excessive permissions: ${overprivilegedPermissions.join(', ')}`,
        severity: 'high',
        assetId: serverless.id,
        provider: serverless.provider,
        service: serverless.service,
        region: serverless.region,
        compliance: [
          { framework: 'CIS', control: '1.1.0' },
          { framework: 'NIST', control: 'AC-3' },
        ],
        remediation: {
          description: 'Reduce function permissions to minimum required',
          code: `# AWS IAM Policy Example\n{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Effect": "Allow",\n      "Action": [\n        "dynamodb:GetItem",\n        "dynamodb:PutItem"\n      ],\n      "Resource": "arn:aws:dynamodb:*:*:table/your-table"\n    }\n  ]\n}`,
        },
        serverlessContext: {
          functionName: serverless.name,
          runtime: serverless.runtime,
          region: serverless.region,
          triggerTypes: serverless.triggers.map(t => t.type),
          vpcEnabled: !!serverless.vpcConfig,
        },
        permissionDetails: {
          overprivileged: true,
          excessivePermissions: overprivilegedPermissions,
          riskLevel: 'high',
        },
      });
    }

    return findings;
  }

  /**
   * Analyze serverless environment variables
   */
  private analyzeServerlessEnvironment(serverless: ServerlessAsset): ServerlessSecurityFinding[] {
    const findings: ServerlessSecurityFinding[] = [];
    const environment = serverless.environment;

    // Check for hardcoded secrets
    for (const [key, value] of Object.entries(environment.variables)) {
      if (this.isPotentialSecret(key, value)) {
        findings.push({
          id: `serverless-secret-env-${serverless.id}-${key}`,
          rule: 'serverless-secret-in-environment',
          title: `Potential Secret in Environment Variable: ${key}`,
          description: `Environment variable ${key} may contain sensitive information`,
          severity: 'high',
          assetId: serverless.id,
          provider: serverless.provider,
          service: serverless.service,
          region: serverless.region,
          compliance: [
            { framework: 'CIS', control: '1.1.0' },
            { framework: 'NIST', control: 'SC-13' },
          ],
          remediation: {
            description: 'Move secrets to secure parameter store or secret manager',
            code: `# AWS Lambda Example\nimport boto3\nimport os\n\nssm = boto3.client('ssm')\n\ndef lambda_handler(event, context):\n    secret = ssm.get_parameter(\n        Name='/myapp/database/password',\n        WithDecryption=True\n    )['Parameter']['Value']`,
          },
          serverlessContext: {
            functionName: serverless.name,
            runtime: serverless.runtime,
            region: serverless.region,
            triggerTypes: serverless.triggers.map(t => t.type),
            vpcEnabled: !!serverless.vpcConfig,
          },
        });
      }
    }

    return findings;
  }

  /**
   * Analyze serverless triggers
   */
  private analyzeServerlessTriggers(serverless: ServerlessAsset): ServerlessSecurityFinding[] {
    const findings: ServerlessSecurityFinding[] = [];

    for (const trigger of serverless.triggers) {
      // Check for public API triggers
      if (trigger.type === 'api_gateway') {
        const auth = trigger.authentication || 'none';
        if (auth === 'none') {
          findings.push({
            id: `serverless-public-api-${serverless.id}-${trigger.source}`,
            rule: 'serverless-public-api-no-auth',
            title: 'Serverless Function Has Public API Endpoint Without Authentication',
            description: 'Function is exposed via public API without authentication',
            severity: 'high',
            assetId: serverless.id,
            provider: serverless.provider,
            service: serverless.service,
            region: serverless.region,
            compliance: [
              { framework: 'CIS', control: '1.1.0' },
              { framework: 'NIST', control: 'AC-3' },
            ],
            remediation: {
              description: 'Add authentication to API gateway endpoint',
              code: `# AWS API Gateway\nresources:\n  Resources:\n    ApiGatewayRestApi:\n      Type: AWS::Serverless::Api\n      Properties:\n        Auth:\n          DefaultAuthorizer: MyLambdaTokenAuthorizer\n          AddDefaultAuthorizerToCorsPreflight: false\n          Authorizers:\n            MyLambdaTokenAuthorizer:\n              Identity:\n                Header: Authorization\n              PayloadFormatVersion: '2.0'`,
            },
            serverlessContext: {
              functionName: serverless.name,
              runtime: serverless.runtime,
              region: serverless.region,
              triggerTypes: serverless.triggers.map(t => t.type),
              vpcEnabled: !!serverless.vpcConfig,
            },
          });
        }
      }

      // Check for overly permissive S3 triggers
      if (trigger.type === 's3') {
        const config = trigger.configuration;
        if (config.events?.includes('s3:ObjectCreated:*')) {
          findings.push({
            id: `serverless-broad-s3-trigger-${serverless.id}-${trigger.source}`,
            rule: 'serverless-broad-s3-trigger',
            title: 'Serverless Function Has Broad S3 Trigger',
            description: 'Function triggers on all S3 object creation events',
            severity: 'medium',
            assetId: serverless.id,
            provider: serverless.provider,
            service: serverless.service,
            region: serverless.region,
            compliance: [
              { framework: 'CIS', control: '1.1.0' },
              { framework: 'NIST', control: 'AC-3' },
            ],
            remediation: {
              description: 'Restrict S3 trigger to specific prefixes or suffixes',
              code: `# AWS SAM Template\nEvents:\n  S3Upload:\n    Type: S3\n    Properties:\n      Bucket: !Ref MyBucket\n      Events: s3:ObjectCreated:*\n      Filter:\n        S3Key:\n          Rules:\n            - Name: suffix\n              Value: .jpg`,
            },
            serverlessContext: {
              functionName: serverless.name,
              runtime: serverless.runtime,
              region: serverless.region,
              triggerTypes: serverless.triggers.map(t => t.type),
              vpcEnabled: !!serverless.vpcConfig,
            },
          });
        }
      }
    }

    return findings;
  }

  /**
   * Analyze serverless VPC configuration
   */
  private analyzeServerlessVPC(serverless: ServerlessAsset): ServerlessSecurityFinding[] {
    const findings: ServerlessSecurityFinding[] = [];

    if (!serverless.vpcConfig) {
      findings.push({
        id: `serverless-no-vpc-${serverless.id}`,
        rule: 'serverless-no-vpc-configuration',
        title: 'Serverless Function Not in VPC',
        description: 'Function is not configured to run within a VPC',
        severity: 'medium',
        assetId: serverless.id,
        provider: serverless.provider,
        service: serverless.service,
        region: serverless.region,
        compliance: [
          { framework: 'CIS', control: '1.1.0' },
          { framework: 'NIST', control: 'SC-7' },
        ],
        remediation: {
          description: 'Configure function to run within VPC for network isolation',
          code: `# AWS Lambda VPC Configuration\nVpcConfig:\n  SecurityGroupIds:\n    - sg-12345678\n  SubnetIds:\n    - subnet-12345678\n    - subnet-87654321`,
        },
        serverlessContext: {
          functionName: serverless.name,
          runtime: serverless.runtime,
          region: serverless.region,
          triggerTypes: serverless.triggers.map(t => t.type),
          vpcEnabled: false,
        },
      });
    }

    return findings;
  }

  /**
   * Analyze serverless layers
   */
  private async analyzeServerlessLayers(serverless: ServerlessAsset): Promise<ServerlessSecurityFinding[]> {
    const findings: ServerlessSecurityFinding[] = [];

    for (const layer of serverless.layers) {
      // Check for large layers
      if (layer.size > 50000000) { // 50MB
        findings.push({
          id: `serverless-large-layer-${serverless.id}-${layer.name}`,
          rule: 'serverless-large-layer',
          title: `Serverless Layer is Large: ${layer.name}`,
          description: `Layer ${layer.name} is ${Math.round(layer.size / 1000000)}MB, which may impact performance`,
          severity: 'low',
          assetId: serverless.id,
          provider: serverless.provider,
          service: serverless.service,
          region: serverless.region,
          remediation: {
            description: 'Optimize layer size by removing unnecessary dependencies',
            code: '# Optimize layer size\n# 1. Use multi-stage builds\n# 2. Remove development dependencies\n# 3. Compress dependencies',
          },
          serverlessContext: {
            functionName: serverless.name,
            runtime: serverless.runtime,
            region: serverless.region,
            triggerTypes: serverless.triggers.map(t => t.type),
            vpcEnabled: !!serverless.vpcConfig,
          },
        });
      }

      // Check for outdated layers
      const layerAge = Date.now() - new Date(layer.arn).getTime();
      if (layerAge > 365 * 24 * 60 * 60 * 1000) { // 1 year
        findings.push({
          id: `serverless-outdated-layer-${serverless.id}-${layer.name}`,
          rule: 'serverless-outdated-layer',
          title: `Serverless Layer is Outdated: ${layer.name}`,
          description: `Layer ${layer.name} has not been updated in over a year`,
          severity: 'low',
          assetId: serverless.id,
          provider: serverless.provider,
          service: serverless.service,
          region: serverless.region,
          remediation: {
            description: 'Update layer dependencies to latest secure versions',
            code: '# Update layer dependencies\nnpm update\n# or\npip install --upgrade -r requirements.txt',
          },
          serverlessContext: {
            functionName: serverless.name,
            runtime: serverless.runtime,
            region: serverless.region,
            triggerTypes: serverless.triggers.map(t => t.type),
            vpcEnabled: !!serverless.vpcConfig,
          },
        });
      }
    }

    return findings;
  }

  // Helper methods
  private async fetchVulnerabilities(image: ContainerImage): Promise<ImageVulnerability[]> {
    // Simulate vulnerability scanning
    // In real implementation, this would call vulnerability databases
    return [
      {
        id: 'CVE-2023-1234',
        severity: 'high',
        title: 'OpenSSL Vulnerability',
        description: 'OpenSSL version has known vulnerabilities',
        package: 'openssl',
        version: '1.1.1f',
        fixedVersion: '1.1.1g',
        cve: 'CVE-2023-1234',
        cvss: 7.5,
        references: ['https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-1234'],
      },
      {
        id: 'CVE-2023-5678',
        severity: 'medium',
        title: 'NPM Package Vulnerability',
        description: 'Outdated npm package with security issues',
        package: 'lodash',
        version: '4.17.20',
        fixedVersion: '4.17.21',
        cve: 'CVE-2023-5678',
        cvss: 5.3,
        references: ['https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-5678'],
      },
    ];
  }

  private async fetchSecrets(image: ContainerImage): Promise<ImageSecret[]> {
    // Simulate secret scanning
    return [
      {
        type: 'api_key',
        value: 'sk-1234567890abcdef',
        location: '/app/config.json',
        severity: 'critical',
        description: 'Potential API key found in configuration file',
      },
      {
        type: 'password',
        value: 'admin123',
        location: '/app/secrets.env',
        severity: 'high',
        description: 'Hardcoded password found in environment file',
      },
    ];
  }

  private checkOverprivilegedPermissions(permissions: ServerlessPermissions): string[] {
    const overprivileged = [];
    const dangerousPermissions = [
      'iam:*',
      's3:*',
      'ec2:*',
      'lambda:*',
      '*:*',
    ];

    for (const policy of permissions.policies) {
      if (dangerousPermissions.some(dangerous => policy.includes(dangerous))) {
        overprivileged.push(policy);
      }
    }

    return overprivileged;
  }

  private isPotentialSecret(key: string, value: string): boolean {
    const secretPatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /credential/i,
      /auth/i,
    ];

    const secretValues = [
      /^[A-Za-z0-9+/]{40,}={0,2}$/, // Base64 encoded
      /^sk-[a-zA-Z0-9]{20,}$/, // Stripe-like keys
      /^ghp_[a-zA-Z0-9]{36}$/, // GitHub tokens
    ];

    return secretPatterns.some(pattern => pattern.test(key)) ||
           secretValues.some(pattern => pattern.test(value));
  }

  private mapVulnerabilityToCompliance(vulnerability: ImageVulnerability) {
    const compliance = [];
    
    if (vulnerability.severity === 'critical') {
      compliance.push(
        { framework: 'CIS', control: '5.1.1' },
        { framework: 'NIST', control: 'SI-2' },
        { framework: 'PCI-DSS', control: '6.2' }
      );
    } else if (vulnerability.severity === 'high') {
      compliance.push(
        { framework: 'CIS', control: '5.1.2' },
        { framework: 'NIST', control: 'SI-3' }
      );
    }

    return compliance;
  }

  private generateRemediationCode(container: ContainerAsset, vulnerability: ImageVulnerability): string {
    return `# Update container image to fix vulnerability\n# Dockerfile example\nFROM ${container.image.baseImage}\n\n# Update vulnerable package\nRUN apt-get update && apt-get install -y ${vulnerability.package}=${vulnerability.fixedVersion}\n\n# Or use specific package manager\n# RUN apk add --update ${vulnerability.package}=${vulnerability.fixedVersion}\n# RUN npm install ${vulnerability.package}@${vulnerability.fixedVersion}`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContainerServerlessConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContainerServerlessConfig {
    return { ...this.config };
  }
}
