import {
  stubAddress,
  stubDocument,
  stubDocumentEvent,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/utils';
import {
  DocumentLoaderService,
  stubDocumentEntity,
} from '@carrot-fndn/shared/document/loader';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import { MaximumDistanceProcessor } from './maximum-distance.processor';
import { MAXIMUM_DISTANCE_RESULT_COMMENT } from './maximum-distance.processor.constants';

jest.mock('@carrot-fndn/shared/document/loader');

describe('MaximumDistanceProcessor', () => {
  const ruleDataProcessor = new MaximumDistanceProcessor();
  const documentLoaderService = jest.mocked(DocumentLoaderService.prototype);

  it.each([
    {
      document: undefined as unknown as Document,
      resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'is undefined',
    },
    {
      document: random<Omit<Document, 'category'>>(),
      resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'has invalid type',
    },
    {
      document: random<Omit<Document, 'externalEvents'>>(),
      resultComment: MAXIMUM_DISTANCE_RESULT_COMMENT.pick_up_not_found,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'does not have external events',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            metadata: {
              attributes: [
                {
                  isPublic: faker.datatype.boolean(),
                  name: DocumentEventAttributeName.MOVE_TYPE,
                  value: DocumentEventMoveType.PICK_UP,
                },
              ],
            },
            name: DocumentEventName.MOVE,
          }),
        ],
      }),
      resultComment: MAXIMUM_DISTANCE_RESULT_COMMENT.drop_off_not_found,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'does not have the Pick-up or Drop-off event',
    },
    {
      document: stubDocument({
        externalEvents: [
          stubDocumentEvent({
            address: stubAddress({
              latitude: 0,
              longitude: 0,
            }),
            metadata: {
              attributes: [
                {
                  isPublic: faker.datatype.boolean(),
                  name: DocumentEventAttributeName.MOVE_TYPE,
                  value: DocumentEventMoveType.PICK_UP,
                },
              ],
            },
            name: DocumentEventName.MOVE,
          }),
          stubDocumentEvent({
            address: stubAddress({
              latitude: 100,
              longitude: 100,
            }),
            metadata: {
              attributes: [
                {
                  isPublic: faker.datatype.boolean(),
                  name: DocumentEventAttributeName.MOVE_TYPE,
                  value: DocumentEventMoveType.DROP_OFF,
                },
              ],
            },
            name: DocumentEventName.MOVE,
          }),
        ],
      }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'distance between the Pick-up and Drop-off event is too far',
    },
  ])(
    `should return "$resultStatus" when the document $scenario`,
    async ({ document, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();
      const documentEntity = {
        ...stubDocumentEntity(),
        document,
      };

      documentLoaderService.load.mockResolvedValueOnce(documentEntity);

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
