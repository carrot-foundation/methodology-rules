export interface BaseRuleDefinition<TInput = never> {
  description: string;
  events: string[];
  input?: TInput;
  name: string;
  slug: string;
  version: string;
}

export interface RuleDefinition<
  TMethodologyFrameworkRuleSlug extends string = string,
  TInput = never,
> extends BaseRuleDefinition<TInput> {
  methodologyFrameworkRules: TMethodologyFrameworkRuleSlug[];
}
