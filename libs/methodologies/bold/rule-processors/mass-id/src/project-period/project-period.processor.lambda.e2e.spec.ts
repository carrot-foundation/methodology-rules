import { testRuleProcessorWithMassDocuments } from '@carrot-fndn/shared/methodologies/bold/testing';

import { projectPeriodProcessorLambda } from './project-period.processor.lambda';

testRuleProcessorWithMassDocuments({
  handler: projectPeriodProcessorLambda,
  ruleName: 'ProjectPeriodProcessor',
});
