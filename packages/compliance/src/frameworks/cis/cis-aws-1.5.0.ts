import { ComplianceFramework, ComplianceControl } from '@cspm/core-engine';

export const CIS_AWS_1_5_0: ComplianceFramework = {
  id: 'cis-aws-1.5.0',
  name: 'CIS AWS Foundations Benchmark',
  version: '1.5.0',
  description: 'Center for Internet Security AWS Foundations Benchmark v1.5.0',
};

export const CIS_AWS_CONTROLS: ComplianceControl[] = [
  // Identity and Access Management
  {
    id: 'cis-aws-1.1',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '1.1',
    title: 'Avoid the use of the root account',
    description: 'The root account has unrestricted access to all resources in the AWS account.',
    category: 'Identity and Access Management',
    severity: 'high',
    implementationGuidance: 'Create individual IAM users for administrative tasks and use the root account only for initial setup.',
    auditGuidance: 'Check that no access keys are associated with the root account and that MFA is enabled.',
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#lock-away-credentials',
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html',
    ],
  },
  {
    id: 'cis-aws-1.2',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '1.2',
    title: 'Ensure multi-factor authentication (MFA) is enabled for all IAM users that have a console password',
    description: 'MFA adds an extra layer of protection on top of a user name and password.',
    category: 'Identity and Access Management',
    severity: 'high',
    implementationGuidance: 'Enable MFA for all IAM users with console access. Use virtual MFA devices or hardware MFA tokens.',
    auditGuidance: 'Verify that all IAM users with console passwords have MFA devices configured.',
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html',
    ],
  },
  {
    id: 'cis-aws-1.3',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '1.3',
    title: 'Ensure credentials unused for 90 days or greater are disabled',
    description: 'Disabling or removing unnecessary credentials reduces the attack surface.',
    category: 'Identity and Access Management',
    severity: 'medium',
    implementationGuidance: 'Regularly review and disable IAM user credentials that have not been used in 90 days.',
    auditGuidance: 'Check the last used date for IAM user access keys and console passwords.',
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_finding-unused.html',
    ],
  },
  {
    id: 'cis-aws-1.4',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '1.4',
    title: 'Ensure access keys are rotated every 90 days or less',
    description: 'Regularly rotating access keys reduces the risk of key compromise.',
    category: 'Identity and Access Management',
    severity: 'medium',
    implementationGuidance: 'Implement a process to rotate IAM user access keys every 90 days.',
    auditGuidance: 'Check the creation date of active access keys.',
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_RotateAccessKey',
    ],
  },
  {
    id: 'cis-aws-1.5',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '1.5',
    title: 'Ensure IAM password policy requires at least one uppercase letter',
    description: 'Strong password policies increase account security.',
    category: 'Identity and Access Management',
    severity: 'medium',
    implementationGuidance: 'Configure IAM password policy to require at least one uppercase letter.',
    auditGuidance: 'Review the IAM account password policy settings.',
    references: [
      'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html',
    ],
  },

  // Storage
  {
    id: 'cis-aws-2.1.1',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '2.1.1',
    title: 'Ensure all S3 buckets employ encryption-at-rest',
    description: 'Amazon S3 buckets should be encrypted to protect data at rest.',
    category: 'Storage',
    severity: 'high',
    implementationGuidance: 'Enable default encryption on all S3 buckets using SSE-S3 or SSE-KMS.',
    auditGuidance: 'Check that all S3 buckets have server-side encryption enabled.',
    references: [
      'https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-encryption.html',
    ],
  },
  {
    id: 'cis-aws-2.1.2',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '2.1.2',
    title: 'Ensure S3 Bucket Policy allows HTTPS requests',
    description: 'S3 bucket policies should require HTTPS to encrypt data in transit.',
    category: 'Storage',
    severity: 'medium',
    implementationGuidance: 'Configure S3 bucket policies with a condition that requires SecureTransport.',
    auditGuidance: 'Review S3 bucket policies for SecureTransport condition.',
    references: [
      'https://docs.aws.amazon.com/AmazonS3/latest/dev/security-best-practices.html',
    ],
  },
  {
    id: 'cis-aws-2.1.3',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '2.1.3',
    title: 'Ensure MFA Delete is enabled on S3 buckets',
    description: 'MFA Delete requires additional authentication to delete objects.',
    category: 'Storage',
    severity: 'medium',
    implementationGuidance: 'Enable MFA Delete on S3 buckets containing sensitive data.',
    auditGuidance: 'Check S3 bucket versioning configuration for MFA Delete status.',
    references: [
      'https://docs.aws.amazon.com/AmazonS3/latest/dev/Versioning.html#MultiFactorAuthenticationDelete',
    ],
  },

  // Logging
  {
    id: 'cis-aws-3.1',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '3.1',
    title: 'Ensure CloudTrail is enabled in all regions',
    description: 'CloudTrail provides visibility into API calls made in your AWS account.',
    category: 'Logging',
    severity: 'high',
    implementationGuidance: 'Enable CloudTrail in all regions and configure to log all management events.',
    auditGuidance: 'Verify that at least one multi-region CloudTrail trail exists.',
    references: [
      'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html',
    ],
  },
  {
    id: 'cis-aws-3.2',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '3.2',
    title: 'Ensure CloudTrail log file validation is enabled',
    description: 'Log file validation helps detect if log files have been tampered with.',
    category: 'Logging',
    severity: 'medium',
    implementationGuidance: 'Enable log file validation on CloudTrail trails.',
    auditGuidance: 'Check CloudTrail trail configuration for log file validation.',
    references: [
      'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation.html',
    ],
  },
  {
    id: 'cis-aws-3.3',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '3.3',
    title: 'Ensure the S3 bucket used by CloudTrail is not publicly accessible',
    description: 'CloudTrail logs contain sensitive information and should not be publicly accessible.',
    category: 'Logging',
    severity: 'high',
    implementationGuidance: 'Configure S3 bucket policies to deny public access to CloudTrail logs.',
    auditGuidance: 'Review S3 bucket policies for CloudTrail log buckets.',
    references: [
      'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-s3-bucket-policy.html',
    ],
  },

  // Monitoring
  {
    id: 'cis-aws-4.1',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '4.1',
    title: 'Ensure a log metric filter and alarm exist for unauthorized API calls',
    description: 'Monitoring unauthorized API calls helps detect malicious activity.',
    category: 'Monitoring',
    severity: 'high',
    implementationGuidance: 'Create CloudWatch log metric filters and alarms for unauthorized API calls.',
    auditGuidance: 'Check CloudWatch alarms and log metric filters.',
    references: [
      'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html',
    ],
  },
  {
    id: 'cis-aws-4.2',
    frameworkId: 'cis-aws-1.5.0',
    controlId: '4.2',
    title: 'Ensure a log metric filter and alarm exist for Management Console sign-in without MFA',
    description: 'Monitoring console sign-ins without MFA helps detect unauthorized access.',
    category: 'Monitoring',
    severity: 'medium',
    implementationGuidance: 'Create CloudWatch log metric filters and alarms for console sign-ins without MFA.',
    auditGuidance: 'Check CloudWatch alarms and log metric filters.',
    references: [
      'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html',
    ],
  },
];

// Rule mappings for CIS AWS controls
export const CIS_AWS_RULE_MAPPINGS = [
  // Control 1.1: Avoid use of root account
  {
    controlId: 'cis-aws-1.1',
    ruleId: 'aws-iam-root-account-usage',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Check root account access key status', 'Check root account MFA status'],
  },

  // Control 1.2: MFA for IAM users
  {
    controlId: 'cis-aws-1.2',
    ruleId: 'aws-iam-user-mfa-enabled',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Verify MFA device is enabled for all console users'],
  },

  // Control 1.3: Unused credentials
  {
    controlId: 'cis-aws-1.3',
    ruleId: 'aws-iam-access-key-age',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Check last used date for access keys', 'Check password last used date'],
  },

  // Control 1.4: Access key rotation
  {
    controlId: 'cis-aws-1.4',
    ruleId: 'aws-iam-access-key-age',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Check access key creation date'],
  },

  // Control 2.1.1: S3 encryption
  {
    controlId: 'cis-aws-2.1.1',
    ruleId: 'aws-s3-bucket-encryption',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Check server-side encryption configuration'],
  },

  // Control 2.1.2: S3 HTTPS
  {
    controlId: 'cis-aws-2.1.2',
    ruleId: 'aws-s3-bucket-https-only',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Check bucket policy for SecureTransport condition'],
  },

  // Control 2.1.3: S3 MFA Delete
  {
    controlId: 'cis-aws-2.1.3',
    ruleId: 'aws-s3-bucket-mfa-delete',
    mappingType: 'direct' as const,
    evidenceRequirements: ['Check versioning configuration for MFA Delete'],
  },
];
