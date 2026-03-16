export const frameworkRules = [] as const;

export type FrameworkRuleSlug = (typeof frameworkRules)[number]['slug'];
