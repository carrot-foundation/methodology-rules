import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

export const formatAsJson = (result: RuleOutput): string =>
  JSON.stringify(result, undefined, 2);
