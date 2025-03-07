import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { ProjectSizeProcessor } from './project-size.processor';

const instance = new ProjectSizeProcessor();

export const projectSizeLambda = wrapRuleIntoLambdaHandler(instance);
