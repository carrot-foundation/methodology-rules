import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { CheckOrganicMassCriteriaProcessor } from './check-organic-mass-criteria.processor';

const instance = new CheckOrganicMassCriteriaProcessor();

export const checkOrganicMassCriteriaLambda =
  wrapRuleIntoLambdaHandler(instance);
