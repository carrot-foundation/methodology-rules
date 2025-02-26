import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DocumentCategoryProcessor } from './lib/document-category.processor';

const instance = new DocumentCategoryProcessor();

export const handler = wrapRuleIntoLambdaHandler(instance);
