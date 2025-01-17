import { testRuleProcessorWithMassDocuments } from '@carrot-fndn/methodologies/bold/recycling/organic/testing';

import { handler } from '../lambda';

testRuleProcessorWithMassDocuments({
  handler,
  ruleName: 'MoveTypeProcessor',
});
