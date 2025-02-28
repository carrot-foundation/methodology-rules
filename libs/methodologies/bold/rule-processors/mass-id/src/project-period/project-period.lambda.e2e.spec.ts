import { testRuleProcessorWithMassDocuments } from '@carrot-fndn/shared/methodologies/bold/testing';

import { projectPeriodLambda } from './project-period.lambda';

testRuleProcessorWithMassDocuments({
  handler: projectPeriodLambda,
  ruleName: 'ProjectPeriodProcessor',
});
