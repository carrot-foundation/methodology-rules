import type { MethodologyRuleEvent } from '@carrot-fndn/shared/lambda/types';
import type { Context } from 'aws-lambda';

import { random } from 'typia';

export const stubRuleInput = (partial?: Partial<MethodologyRuleEvent>) => ({
  ...random<MethodologyRuleEvent>(),
  ...partial,
});

export const stubContext = () => random<Context>();

export const stubRuleResponse = () => random<unknown>();
