import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassIdQualificationsProcessor } from './mass-id-qualifications.processor';

const instance = new MassIdQualificationsProcessor();

export const massIdQualificationsLambda = wrapRuleIntoLambdaHandler(instance);
