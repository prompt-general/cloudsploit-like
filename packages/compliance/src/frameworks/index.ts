import { CIS_AWS_1_5_0, CIS_AWS_CONTROLS, CIS_AWS_RULE_MAPPINGS } from './cis/cis-aws-1.5.0';
import { SOC2_2023, SOC2_CONTROLS, SOC2_RULE_MAPPINGS } from './soc2/soc2-2023';
import { PCI_DSS_4_0, PCI_DSS_CONTROLS, PCI_DSS_RULE_MAPPINGS } from './pcidss/pcidss-4.0';
import { CLOUD_SECURITY_BASELINE, CLOUD_SECURITY_BASELINE_RULE_MAPPINGS } from './shared/cloud-security-baseline';

export interface FrameworkDefinition {
  framework: any;
  controls: any[];
  mappings: any[];
}

export const FRAMEWORKS: Record<string, FrameworkDefinition> = {
  'cis-aws-1.5.0': {
    framework: CIS_AWS_1_5_0,
    controls: CIS_AWS_CONTROLS,
    mappings: CIS_AWS_RULE_MAPPINGS,
  },
  'soc2-2023': {
    framework: SOC2_2023,
    controls: SOC2_CONTROLS,
    mappings: SOC2_RULE_MAPPINGS,
  },
  'pcidss-4.0': {
    framework: PCI_DSS_4_0,
    controls: PCI_DSS_CONTROLS,
    mappings: PCI_DSS_RULE_MAPPINGS,
  },
  'cloud-security-baseline': {
    framework: CLOUD_SECURITY_BASELINE,
    controls: CLOUD_SECURITY_BASELINE.controls,
    mappings: CLOUD_SECURITY_BASELINE_RULE_MAPPINGS,
  },
};

export function getFramework(id: string): FrameworkDefinition | undefined {
  return FRAMEWORKS[id];
}

export function getAllFrameworks(): FrameworkDefinition[] {
  return Object.values(FRAMEWORKS);
}

export function getFrameworkIds(): string[] {
  return Object.keys(FRAMEWORKS);
}
