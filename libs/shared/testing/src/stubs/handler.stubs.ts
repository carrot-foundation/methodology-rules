import type { MethodologyRuleEvent } from '@carrot-fndn/shared/lambda/types';
import type { RuleOutput } from '@carrot-fndn/shared/rule/types';
import type { Context } from 'aws-lambda';

import {
  RuleInputSchema,
  RuleOutputSchema,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';

import { createStubFromSchema } from './zod.stubs';

export const stubRuleInput = (
  partial?: Partial<MethodologyRuleEvent>,
): MethodologyRuleEvent => createStubFromSchema(RuleInputSchema, partial);

export const stubContext = (): Context => ({
  awsRequestId: faker.string.uuid(),
  callbackWaitsForEmptyEventLoop: false,
  done: () => {},
  fail: () => {},
  functionName: faker.string.sample(),
  functionVersion: faker.string.sample(),
  getRemainingTimeInMillis: () => faker.number.int({ max: 900_000 }),
  invokedFunctionArn: faker.string.sample(),
  logGroupName: faker.string.sample(),
  logStreamName: faker.string.sample(),
  memoryLimitInMB: faker.string.numeric(),
  succeed: () => {},
});

export const stubRuleOutput = (partial?: Partial<RuleOutput>): RuleOutput =>
  createStubFromSchema(RuleOutputSchema, partial);

export const stubRuleResponse = () => ({
  [faker.string.sample()]: faker.string.sample(),
});
