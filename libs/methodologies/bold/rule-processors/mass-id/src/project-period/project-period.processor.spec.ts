import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { addDays, subDays } from 'date-fns';
import { random } from 'typia';

import { ProjectPeriodProcessor } from './project-period.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('ProjectPeriodProcessor', () => {
  const ruleDataProcessor = new ProjectPeriodProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const { RECYCLED } = DocumentEventName;

  it.each([
    {
      externalCreatedAt: addDays(
        ruleDataProcessor['ELIGIBLE_DATE'],
        1,
      ).toISOString(),
      resultComment: ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created after the eligible date',
    },
    {
      externalCreatedAt: subDays(
        ruleDataProcessor['ELIGIBLE_DATE'],
        1,
      ).toISOString(),
      resultComment: ruleDataProcessor['RESULT_COMMENT'].INELIGIBLE,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should REJECT the rule if the Recycled event was created before the eligible date',
    },
    {
      externalCreatedAt: ruleDataProcessor['ELIGIBLE_DATE'].toISOString(),
      resultComment: ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created on the eligible date',
    },
    {
      externalCreatedAt: ruleDataProcessor['ELIGIBLE_DATE'].toISOString(),
      resultComment: ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created on the eligible date',
    },
    {
      externalCreatedAt: undefined,
      resultComment:
        ruleDataProcessor['RESULT_COMMENT']
          .MISSING_RECYCLED_EVENT_EXTERNAL_CREATED_AT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should REJECT the rule if the Recycled event has no externalCreatedAt attribute',
    },
  ])(
    '$scenario',
    async ({ externalCreatedAt, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      const document = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            externalCreatedAt,
            name: RECYCLED,
          }),
        ],
      });

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
    },
  );

  it('should REJECT the rule if the Recycled event is not found', async () => {
    const ruleInput = random<Required<RuleInput>>();

    const document = stubDocument({
      externalEvents: [],
    });

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toMatchObject({
      resultComment: ruleDataProcessor['RESULT_COMMENT'].MISSING_RECYCLED_EVENT,
      resultStatus: RuleOutputStatus.REJECTED,
    });
  });
});
