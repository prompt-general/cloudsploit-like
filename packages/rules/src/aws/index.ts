import { s3PublicAccessRule } from './s3/public-access';
import { s3EncryptionRule } from './s3/encryption';
import { s3VersioningRule } from './s3/versioning';
import { iamMFARule } from './iam/mfa-enabled';
import { iamAccessKeyAgeRule } from './iam/access-key-age';

export const awsRules = [
  s3PublicAccessRule,
  s3EncryptionRule,
  s3VersioningRule,
  iamMFARule,
  iamAccessKeyAgeRule,
];

export { s3PublicAccessRule, s3EncryptionRule, s3VersioningRule, iamMFARule, iamAccessKeyAgeRule };
