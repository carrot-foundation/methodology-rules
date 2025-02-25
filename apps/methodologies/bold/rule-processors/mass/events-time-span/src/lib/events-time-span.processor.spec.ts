import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { EventsTimeSpanProcessor } from './events-time-span.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const { DROP_OFF } = DocumentEventMoveType;
const { MOVE_TYPE } = DocumentEventAttributeName;

describe('EventsTimeSpanProcessor', () => {
  const ruleDataProcessor = new EventsTimeSpanProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      endEventDate: '2024-02-27T11:00:00.000Z',
      eventWithDropOffValueDate: '2024-02-25T12:00:00.000Z',
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
    },
    {
      endEventDate: '2024-02-27T12:00:00.000Z',
      eventWithDropOffValueDate: undefined,
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
    },
    {
      endEventDate: '2024-02-27T11:00:00.000Z',
      eventWithDropOffValueDate: '2023-11-25T12:00:00.000Z',
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
    },
  ])(
    `should the difference between END event's date and the event with DROP_OFF value date must be between 60 and 120: $resultStatus`,
    async ({
      endEventDate,
      eventWithDropOffValueDate,
      resultComment,
      resultStatus,
    }) => {
      const ruleInput = random<Required<RuleInput>>();
      const document = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            {
              externalCreatedAt: eventWithDropOffValueDate,
              name: random<DocumentEventName>(),
            },
            [[MOVE_TYPE, DROP_OFF]],
          ),
          stubDocumentEvent({
            externalCreatedAt: endEventDate,
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
