export interface RuleDefinition<TFrameworkRuleSlug extends string = string> {
  description: string;
  events: string[];
  frameworkRules: TFrameworkRuleSlug[];
  name: string;
  slug: string;
}
