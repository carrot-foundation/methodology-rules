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
import { random } from 'typia';

import { TimeIntervalCheckProcessor } from './time-interval-check.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('TimeIntervalCheckProcessor', () => {
  const ruleDataProcessor = new TimeIntervalCheckProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      dropOffEventDate: '2024-02-25T12:00:00.000Z',
      recycledEventDate: '2024-02-27T11:00:00.000Z',
      resultComment: ruleDataProcessor['RESULT_COMMENT'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'Time interval is less than 60 days (2 days)',
    },
    {
      dropOffEventDate: undefined,
      recycledEventDate: '2024-02-27T12:00:00.000Z',
      resultComment: ruleDataProcessor['RESULT_COMMENT'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'Drop off event date is missing',
    },
    {
      dropOffEventDate: '2023-11-25T12:00:00.000Z',
      recycledEventDate: '2024-02-27T11:00:00.000Z',
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'Time interval is within range (94 days)',
    },
    {
      dropOffEventDate: '2023-12-29T12:00:00.000Z',
      recycledEventDate: '2024-02-27T12:00:00.000Z',
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'Edge case: Exactly 60 days (minimum allowed)',
    },
    {
      dropOffEventDate: '2023-08-31T12:00:00.000Z',
      recycledEventDate: '2024-02-27T12:00:00.000Z',
      resultComment: ruleDataProcessor['RESULT_COMMENT'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'Edge case: Exactly 180 days (maximum allowed)',
    },
    {
      dropOffEventDate: '2023-12-30T12:00:00.000Z',
      recycledEventDate: '2024-02-27T12:00:00.000Z',
      resultComment: ruleDataProcessor['RESULT_COMMENT'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'Edge case: 59 days (just below minimum)',
    },
    {
      dropOffEventDate: '2023-08-30T12:00:00.000Z',
      recycledEventDate: '2024-02-27T12:00:00.000Z',
      resultComment: ruleDataProcessor['RESULT_COMMENT'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'Edge case: 181 days (just above maximum)',
    },
    {
      dropOffEventDate: '2023-11-25T12:00:00.000Z',
      recycledEventDate: undefined,
      resultComment: ruleDataProcessor['RESULT_COMMENT'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'Recycled event date is missing',
    },
  ])(
    `should validate time interval between events - $scenario`,
    async ({
      dropOffEventDate,
      recycledEventDate,
      resultComment,
      resultStatus,
    }) => {
      const ruleInput = random<Required<RuleInput>>();
      const document = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            externalCreatedAt: dropOffEventDate,
            name: DocumentEventName.DROP_OFF,
          }),
          stubDocumentEvent({
            externalCreatedAt: recycledEventDate,
            name: DocumentEventName.RECYCLED,
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
});
