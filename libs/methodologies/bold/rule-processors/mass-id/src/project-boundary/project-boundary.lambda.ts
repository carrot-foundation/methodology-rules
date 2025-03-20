import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { ProjectBoundaryProcessor } from './project-boundary.processor';

const instance = new ProjectBoundaryProcessor();

export const projectBoundaryLambda = wrapRuleIntoLambdaHandler(instance);
