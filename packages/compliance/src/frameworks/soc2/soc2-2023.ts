import { ComplianceFramework, ComplianceControl } from '@cspm/core-engine';

export const SOC2_2023: ComplianceFramework = {
  id: 'soc2-2023',
  name: 'SOC 2 Type II',
  version: '2023',
  description: 'Service Organization Control 2 (SOC 2) Trust Services Criteria',
};

export const SOC2_CONTROLS: ComplianceControl[] = [
  // Security (Common Criteria)
  {
    id: 'soc2-cc1.1',
    frameworkId: 'soc2-2023',
    controlId: 'CC1.1',
    title: 'Logical and physical access controls',
    description: 'The entity implements logical and physical access controls to protect against unauthorized access.',
    category: 'Security',
    severity: 'high',
    implementationGuidance: 'Implement identity and access management controls, network security controls, and physical security measures.',
    auditGuidance: 'Review access control policies, user access reviews, and physical security measures.',
    references: [
      'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome.html',
    ],
  },
  {
    id: 'soc2-cc1.2',
    frameworkId: 'soc2-2023',
    controlId: 'CC1.2',
    title: 'System operations',
    description: 'The entity monitors system components and takes action to address anomalies.',
    category: 'Security',
    severity: 'high',
    implementationGuidance: 'Implement monitoring and alerting for security events, system performance, and availability.',
    auditGuidance: 'Review monitoring procedures, alert configurations, and incident response activities.',
    references: [
      'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome.html',
    ],
  },
  {
    id: 'soc2-cc1.3',
    frameworkId: 'soc2-2023',
    controlId: 'CC1.3',
    title: 'Change management',
    description: 'The entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures.',
    category: 'Security',
    severity: 'medium',
    implementationGuidance: 'Establish change management procedures including change approval, testing, and rollback plans.',
    auditGuidance: 'Review change management policies, change records, and approval documentation.',
    references: [
      'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome.html',
    ],
  },
  {
    id: 'soc2-cc1.4',
    frameworkId: 'soc2-2023',
    controlId: 'CC1.4',
    title: 'Risk assessment',
    description: 'The entity identifies and assesses risks that could affect the achievement of objectives.',
    category: 'Security',
    severity: 'medium',
    implementationGuidance: 'Conduct regular risk assessments, maintain risk register, and implement risk treatment plans.',
    auditGuidance: 'Review risk assessment documentation, risk register, and risk treatment activities.',
    references: [
      'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome.html',
    ],
  },

  // Availability
  {
    id: 'soc2-a1.1',
    frameworkId: 'soc2-2023',
    controlId: 'A1.1',
    title: 'System availability',
    description: 'The entity maintains, monitors, and evaluates current processing capacity and use of system components to manage capacity demand and to enable the implementation of additional capacity to help meet its objectives.',
    category: 'Availability',
    severity: 'high',
    implementationGuidance: 'Implement capacity monitoring, scaling policies, and redundancy for critical systems.',
    auditGuidance: 'Review capacity planning documentation, monitoring configurations, and incident reports.',
    references: [
      'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome.html',
    ],
  },

  // Confidentiality
  {
    id: 'soc2-c1.1',
    frameworkId: 'soc2-2023',
    controlId: 'C1.1',
    title: 'Information protection',
    description: 'The entity identifies and maintains confidential information to meet the entity\'s objectives related to confidentiality.',
    category: 'Confidentiality',
    severity: 'high',
    implementationGuidance: 'Classify information, implement data encryption, and establish access controls for confidential data.',
    auditGuidance: 'Review information classification policy, encryption implementations, and access controls.',
    references: [
      'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome.html',
    ],
  },

  // Privacy
  {
    id: 'soc2-p1.1',
    frameworkId: 'soc2-2023',
    controlId: 'P1.1',
    title: 'Privacy notice and consent',
    description: 'The entity provides notice to data subjects about its privacy practices and obtains consent for the collection, use, retention, disclosure, and disposal of personal information.',
    category: 'Privacy',
    severity: 'medium',
    implementationGuidance: 'Maintain privacy notice, obtain consent for data processing, and document consent records.',
    auditGuidance: 'Review privacy notice, consent mechanisms, and consent documentation.',
    references: [
      'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome.html',
    ],
  },
];

export const SOC2_RULE_MAPPINGS = [
  // CC1.1: Logical and physical access controls
  {
    controlId: 'soc2-cc1.1',
    ruleId: 'aws-iam-user-mfa-enabled',
    mappingType: 'partial' as const,
    evidenceRequirements: ['MFA implementation for administrative access'],
  },
  {
    controlId: 'soc2-cc1.1',
    ruleId: 'aws-s3-bucket-public-access',
    mappingType: 'partial' as const,
    evidenceRequirements: ['Access controls for storage resources'],
  },

  // CC1.2: System operations
  {
    controlId: 'soc2-cc1.2',
    ruleId: 'aws-cloudtrail-enabled',
    mappingType: 'partial' as const,
    evidenceRequirements: ['Monitoring of API activities'],
  },

  // C1.1: Information protection
  {
    controlId: 'soc2-c1.1',
    ruleId: 'aws-s3-bucket-encryption',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Encryption of data at rest'],
  },
];
