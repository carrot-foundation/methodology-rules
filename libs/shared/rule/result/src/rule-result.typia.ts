import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { type Credentials } from '@aws-sdk/client-sts';
import { createAssert } from 'typia';

export const assertString = createAssert<string>();
export const assertCredentials = createAssert<Credentials>();
export const assertRuleOutput = createAssert<RuleOutput>();
