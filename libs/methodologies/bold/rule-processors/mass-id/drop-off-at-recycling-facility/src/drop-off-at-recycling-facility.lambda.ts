import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { DropOffAtRecyclingFacilityProcessor } from './drop-off-at-recycling-facility.processor';

const instance = new DropOffAtRecyclingFacilityProcessor();

export const dropOffAtRecyclingFacilityLambda =
  wrapRuleIntoLambdaHandler(instance);
