import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { addDays } from 'date-fns';
import { random } from 'typia';

import { AuditEligibilityCheckProcessor } from './audit-eligibility-check.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('AuditEligibilityCheckProcessor', () => {
  const ruleDataProcessor = new AuditEligibilityCheckProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { RECYCLED } = DocumentEventName;

  it.each([
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({
            externalCreatedAt: addDays(
              ruleDataProcessor['ELIGIBLE_DATE'],
              1,
            ).toISOString(),
            name: RECYCLED,
          }),
        ],
      }),
      resultComment: ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created after the eligible date',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({
            externalCreatedAt: addDays(
              ruleDataProcessor['ELIGIBLE_DATE'],
              -1,
            ).toISOString(),
            name: RECYCLED,
          }),
        ],
      }),
      resultComment: ruleDataProcessor['RESULT_COMMENT'].INELIGIBLE,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should REJECT the rule if the Recycled event was created before the eligible date',
    },
    {
      document: stubDocument({
        externalEvents: [],
      }),
      resultComment: ruleDataProcessor['RESULT_COMMENT'].MISSING_RECYCLED_EVENT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'should REJECT the rule if the Recycled event is not found',
    },
  ])('$scenario', async ({ document, resultComment, resultStatus }) => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultStatus,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
