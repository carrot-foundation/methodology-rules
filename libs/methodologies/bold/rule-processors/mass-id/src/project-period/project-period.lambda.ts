import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { ProjectPeriodProcessor } from './project-period.processor';

const instance = new ProjectPeriodProcessor();

export const projectPeriodLambda = wrapRuleIntoLambdaHandler(instance);
