import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { MassIDQualificationsProcessor } from './mass-id-qualifications.processor';

const instance = new MassIDQualificationsProcessor();

export const massIDQualificationsLambda = wrapRuleIntoLambdaHandler(instance);
