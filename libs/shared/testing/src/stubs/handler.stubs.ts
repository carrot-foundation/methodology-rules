import type { MethodologyRuleEvent } from '@carrot-fndn/shared/lambda/types';
import type { RuleOutput } from '@carrot-fndn/shared/rule/types';
import type { Context } from 'aws-lambda';

import {
  RuleInputSchema,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';

import { stubEnumValue } from './enum.stubs';
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
  getRemainingTimeInMillis: () => faker.number.int(),
  invokedFunctionArn: faker.string.sample(),
  logGroupName: faker.string.sample(),
  logStreamName: faker.string.sample(),
  memoryLimitInMB: faker.string.numeric(),
  succeed: () => {},
});

export const stubRuleOutput = (partial?: Partial<RuleOutput>): RuleOutput => ({
  requestId: faker.string.uuid(),
  responseToken: faker.string.uuid(),
  responseUrl: faker.internet.url(),
  resultComment: faker.lorem.sentence(),
  resultContent: { [faker.string.sample()]: faker.string.sample() },
  resultStatus: stubEnumValue(RuleOutputStatus),
  ...partial,
});

export const stubRuleResponse = () => ({
  [faker.string.sample()]: faker.string.sample(),
});
