export const FRAMEWORK_RULE_TYPES = [
  'structural',
  'methodology',
  'audit',
] as const;

export interface BaseFrameworkRule {
  description: string;
  methodologyReference?: string;
  name: string;
  slug: string;
  type: FrameworkRuleType;
}

export type FrameworkRuleType = (typeof FRAMEWORK_RULE_TYPES)[number];
