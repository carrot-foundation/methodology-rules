import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { ProjectPeriodLimitProcessor } from './project-period-limit.processor';

const instance = new ProjectPeriodLimitProcessor();

export const projectPeriodLimitLambda = wrapRuleIntoLambdaHandler(instance);
