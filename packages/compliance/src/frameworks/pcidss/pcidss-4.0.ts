import { ComplianceFramework, ComplianceControl } from '@cspm/core-engine';

export const PCI_DSS_4_0: ComplianceFramework = {
  id: 'pcidss-4.0',
  name: 'PCI DSS',
  version: '4.0',
  description: 'Payment Card Industry Data Security Standard v4.0',
};

export const PCI_DSS_CONTROLS: ComplianceControl[] = [
  {
    id: 'pcidss-1.2.1',
    frameworkId: 'pcidss-4.0',
    controlId: '1.2.1',
    title: 'Restrict inbound and outbound traffic to that which is necessary',
    description: 'Network security controls restrict all network traffic to only that which is necessary for the cardholder data environment.',
    category: 'Network Security',
    severity: 'high',
    implementationGuidance: 'Implement network segmentation, firewall rules, and security groups to restrict traffic.',
    auditGuidance: 'Review firewall configurations, security group rules, and network architecture.',
    references: [
      'https://www.pcisecuritystandards.org/document_library',
    ],
  },
  {
    id: 'pcidss-2.2.1',
    frameworkId: 'pcidss-4.0',
    controlId: '2.2.1',
    title: 'Implement only one primary function per server',
    description: 'System components are configured to support only one primary function to reduce risk.',
    category: 'System Configuration',
    severity: 'medium',
    implementationGuidance: 'Use separate servers or containers for different functions (web server, database, etc.).',
    auditGuidance: 'Review server configurations and system architecture.',
    references: [
      'https://www.pcisecuritystandards.org/document_library',
    ],
  },
  {
    id: 'pcidss-3.4.1',
    frameworkId: 'pcidss-4.0',
    controlId: '3.4.1',
    title: 'Render PAN unreadable anywhere it is stored',
    description: 'Primary Account Number (PAN) is rendered unreadable anywhere it is stored.',
    category: 'Data Protection',
    severity: 'critical',
    implementationGuidance: 'Implement encryption, tokenization, or truncation for PAN storage.',
    auditGuidance: 'Review data storage implementations and encryption mechanisms.',
    references: [
      'https://www.pcisecuritystandards.org/document_library',
    ],
  },
  {
    id: 'pcidss-8.3.1',
    frameworkId: 'pcidss-4.0',
    controlId: '8.3.1',
    title: 'Implement MFA for all non-console access',
    description: 'Multi-factor authentication is implemented for all non-console administrative access.',
    category: 'Access Control',
    severity: 'high',
    implementationGuidance: 'Require MFA for administrative access to systems and applications.',
    auditGuidance: 'Review authentication mechanisms for administrative access.',
    references: [
      'https://www.pcisecuritystandards.org/document_library',
    ],
  },
  {
    id: 'pcidss-10.2.1',
    frameworkId: 'pcidss-4.0',
    controlId: '10.2.1',
    title: 'Implement automated audit trails',
    description: 'Audit trails are implemented to link all access to system components to each individual user.',
    category: 'Monitoring',
    severity: 'high',
    implementationGuidance: 'Enable logging for all system components and centralize log collection.',
    auditGuidance: 'Review audit trail configurations and log management systems.',
    references: [
      'https://www.pcisecuritystandards.org/document_library',
    ],
  },
];

export const PCI_DSS_RULE_MAPPINGS = [
  {
    controlId: 'pcidss-3.4.1',
    ruleId: 'aws-s3-bucket-encryption',
    mappingType: 'partial' as const,
    evidenceRequirements: ['Encryption of stored data'],
  },
  {
    controlId: 'pcidss-8.3.1',
    ruleId: 'aws-iam-user-mfa-enabled',
    mappingType: 'partial' as const,
    evidenceRequirements: ['MFA for administrative access'],
  },
  {
    controlId: 'pcidss-10.2.1',
    ruleId: 'aws-cloudtrail-enabled',
    mappingType: 'partial' as const,
    evidenceRequirements: ['Audit trail implementation'],
  },
];
