import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { EventsTimeSpanProcessor } from './events-time-span.processor';

jest.mock('@carrot-fndn/methodologies/bold/io-helpers');

describe('EventsTimeSpanProcessor', () => {
  const ruleDataProcessor = new EventsTimeSpanProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      eventEnd: '2024-02-27T11:00:00.000Z',
      eventOpen: '2024-02-25T12:00:00.000Z',
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
    },
    {
      eventEnd: '2024-02-27T12:00:00.000Z',
      eventOpen: undefined,
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
    },
    {
      eventEnd: '2024-02-27T11:00:00.000Z',
      eventOpen: '2023-11-25T12:00:00.000Z',
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
    },
  ])(
    `should the difference between eventEnd and eventOpen must be between 60 and 120: $resultStatus`,
    async ({ eventEnd, eventOpen, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();
      const document = stubDocument({
        externalEvents: [
          stubDocumentEvent({
            externalCreatedAt: eventOpen,
            name: DocumentEventName.OPEN,
          }),
          stubDocumentEvent({
            externalCreatedAt: eventEnd,
            name: DocumentEventName.END,
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
