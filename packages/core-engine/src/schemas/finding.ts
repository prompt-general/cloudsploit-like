import { z } from 'zod';

export const FindingStatus = z.enum(['pass', 'fail', 'warn']);
export type FindingStatus = z.infer<typeof FindingStatus>;

export const Severity = z.enum(['low', 'medium', 'high', 'critical']);
export type Severity = z.infer<typeof Severity>;

export const FindingSchema = z.object({
  id: z.string().optional(),
  scanId: z.string(),
  assetId: z.string(),
  ruleId: z.string(),
  status: FindingStatus,
  severity: Severity,
  evidence: z.record(z.any()).optional(),
  createdAt: z.date().optional(),
});

export type Finding = z.infer<typeof FindingSchema>;

export const RuleSchema = z.object({
  id: z.string(),
  provider: z.string(),
  service: z.string(),
  resourceType: z.string(),
  severity: Severity,
  description: z.string(),
  remediation: z.string(),
  evaluate: z.function().args(z.any()).returns(z.promise(FindingStatus)),
});

export type Rule = z.infer<typeof RuleSchema>;
