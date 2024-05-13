import { testRuleProcessorWithMassDocuments } from '@carrot-fndn/methodologies/bold/testing';

import { handler } from '../lambda';

testRuleProcessorWithMassDocuments({
  handler,
  ruleName: 'PrimaryParticipantAddressProcessor',
});
