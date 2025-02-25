import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { EventValueProcessor } from './event-value.processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('EventValueProcessor', () => {
  const ruleDataProcessor = new EventValueProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      document: stubDocument({
        currentValue: 12_900,
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: true,
                  name: DocumentEventAttributeName.EVENT_VALUE,
                  value: 12_900,
                },
              ],
            },
            name: random<DocumentEventName>(),
          }),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].APPROVED,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should return APPROVED when the event attribute value of the event has the same value declared in the document currentValue',
    },
    {
      document: stubDocument({
        currentValue: 12_900,
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: true,
                  name: DocumentEventAttributeName.EVENT_VALUE,
                  value: 10,
                },
              ],
            },
            name: random<DocumentEventName>(),
          }),
        ],
      }),
      resultComment: ruleDataProcessor['ResultComment'].REJECTED,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should return REJECTED when the event attribute value of the event has a different value declared in the document currentValue',
    },
    {
      document: random<Omit<Document, 'externalEvents'>>(),
      resultComment: ruleDataProcessor['ResultComment'].NOT_APPLICABLE,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'does not have external events',
    },
  ])(`$scenario`, async ({ document, resultComment, resultStatus }) => {
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
