export const METHODOLOGY_FRAMEWORK_RULE_TYPES = [
  'structural',
  'methodology',
  'audit',
] as const;

export interface BaseMethodologyFrameworkRule {
  description: string;
  methodologyReference?: string;
  name: string;
  slug: string;
  type: MethodologyFrameworkRuleType;
}

export type MethodologyFrameworkRuleType =
  (typeof METHODOLOGY_FRAMEWORK_RULE_TYPES)[number];
