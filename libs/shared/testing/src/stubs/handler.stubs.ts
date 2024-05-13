import type {
  MethodologyRuleEvent,
  MethodologyRuleResponse,
} from '@carrot-fndn/shared/lambda/types';
import type { Context } from 'aws-lambda';

import { random } from 'typia';

export const stubRuleInput = (
  partial?: Partial<MethodologyRuleEvent> | undefined,
) => ({
  ...random<MethodologyRuleEvent>(),
  ...partial,
});

export const stubContext = () => random<Context>();

export const stubRuleResponse = () => random<MethodologyRuleResponse>();
