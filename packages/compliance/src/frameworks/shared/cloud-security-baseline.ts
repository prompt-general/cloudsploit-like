// Cloud Security Baseline - Cloud-agnostic security controls
export const CLOUD_SECURITY_BASELINE = {
  id: 'cloud-security-baseline',
  name: 'Cloud Security Baseline',
  version: '1.0.0',
  description: 'Cloud-agnostic security controls applicable to all cloud providers',
  category: 'Security',
  provider: 'multi-cloud',
  controls: [
    {
      id: 'csb-1',
      title: 'Encryption at Rest',
      description: 'Data should be encrypted when stored in cloud services',
      category: 'Data Protection',
      severity: 'high',
      implementationGuidance: 'Enable encryption for storage services, databases, and other data stores using provider-managed or customer-managed keys',
      evidenceRequirements: [
        'Verify encryption is enabled on storage accounts/buckets',
        'Check encryption key management configuration',
        'Review encryption policies and key rotation'
      ]
    },
    {
      id: 'csb-2',
      title: 'Access Control',
      description: 'Access to cloud resources should be properly controlled and monitored',
      category: 'Access Management',
      severity: 'critical',
      implementationGuidance: 'Implement least-privilege access, regular access reviews, and strong authentication mechanisms',
      evidenceRequirements: [
        'Review IAM policies and role assignments',
        'Check for public access configurations',
        'Verify multi-factor authentication requirements',
        'Audit access logs and monitoring'
      ]
    },
    {
      id: 'csb-3',
      title: 'Network Security',
      description: 'Network configurations should prevent unauthorized access',
      category: 'Network Security',
      severity: 'high',
      implementationGuidance: 'Configure network security groups, firewalls, and private endpoints',
      evidenceRequirements: [
        'Review network security rules',
        'Check for public exposure of resources',
        'Verify private endpoint configurations',
        'Assess network segmentation'
      ]
    },
    {
      id: 'csb-4',
      title: 'Logging and Monitoring',
      description: 'Security events and access should be logged and monitored',
      category: 'Monitoring',
      severity: 'medium',
      implementationGuidance: 'Enable comprehensive logging, monitoring, and alerting for security-relevant events',
      evidenceRequirements: [
        'Verify logging is enabled for all services',
        'Check log retention policies',
        'Review monitoring and alerting rules',
        'Test log aggregation and analysis'
      ]
    },
    {
      id: 'csb-5',
      title: 'Data Classification',
      description: 'Data should be classified according to sensitivity',
      category: 'Data Governance',
      severity: 'medium',
      implementationGuidance: 'Implement data classification labels and handling procedures',
      evidenceRequirements: [
        'Review data classification labels',
        'Check handling procedures for different sensitivity levels',
        'Verify data loss prevention controls',
        'Assess data lifecycle management'
      ]
    }
  ]
};

// Cloud-agnostic rule mappings
export const CLOUD_SECURITY_BASELINE_RULE_MAPPINGS = [
  // Encryption controls
  {
    controlId: 'csb-1',
    ruleId: 'aws-s3-bucket-encryption',
    provider: 'aws',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Check server-side encryption configuration'],
  },
  {
    controlId: 'csb-1',
    ruleId: 'azure-storage-account-encryption',
    provider: 'azure',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Check encryption configuration'],
  },
  {
    controlId: 'csb-1',
    ruleId: 'gcp-storage-bucket-encryption',
    provider: 'gcp',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Check bucket encryption settings'],
  },

  // Access control
  {
    controlId: 'csb-2',
    ruleId: 'aws-iam-user-mfa-enabled',
    provider: 'aws',
    mappingType: 'partial' as const,
    evidenceRequirements: ['Verify MFA configuration for IAM users'],
  },
  {
    controlId: 'csb-2',
    ruleId: 'azure-storage-account-public-access',
    provider: 'azure',
    mappingType: 'partial' as const,
    evidenceRequirements: ['Check public access configurations'],
  },
  {
    controlId: 'csb-2',
    ruleId: 'gcp-storage-bucket-public-access',
    provider: 'gcp',
    mappingType: 'partial' as const,
    evidenceRequirements: ['Review IAM policies for public access'],
  },

  // Network security
  {
    controlId: 'csb-3',
    ruleId: 'aws-s3-bucket-public-access',
    provider: 'aws',
    mappingType: 'partial' as const,
    evidenceRequirements: ['Check public access block configuration'],
  },
  {
    controlId: 'csb-3',
    ruleId: 'azure-storage-account-public-access',
    provider: 'azure',
    mappingType: 'partial' as const,
    evidenceRequirements: ['Review network access rules'],
  },
  {
    controlId: 'csb-3',
    ruleId: 'gcp-storage-bucket-public-access',
    provider: 'gcp',
    mappingType: 'partial' as const,
    evidenceRequirements: ['Check VPC service controls and firewall rules'],
  },
];
