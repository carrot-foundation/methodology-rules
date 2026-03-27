export interface BaseRuleDefinition {
  description: string;
  events: string[];
  name: string;
  slug: string;
  version: string;
}

export interface RuleDefinition<
  TMethodologyFrameworkRuleSlug extends string = string,
> extends BaseRuleDefinition {
  methodologyFrameworkRules: TMethodologyFrameworkRuleSlug[];
}
