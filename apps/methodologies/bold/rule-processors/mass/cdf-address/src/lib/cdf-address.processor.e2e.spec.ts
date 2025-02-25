import { testRuleProcessorWithMassDocuments } from '@carrot-fndn/shared/methodologies/bold/testing';

import { handler } from '../lambda';

testRuleProcessorWithMassDocuments({
  handler,
  ruleName: 'CdfAddressProcessor',
});
