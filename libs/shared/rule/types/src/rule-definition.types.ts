export interface BaseRuleDefinition {
  description: string;
  events: string[];
  name: string;
  slug: string;
}

export interface RuleDefinition<TFrameworkRuleSlug extends string = string>
  extends BaseRuleDefinition {
  frameworkRules: TFrameworkRuleSlug[];
}
