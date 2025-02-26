import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { NftMetadataSelection } from './lib';

const instance = new NftMetadataSelection();

export const handler = wrapRuleIntoLambdaHandler(instance);
