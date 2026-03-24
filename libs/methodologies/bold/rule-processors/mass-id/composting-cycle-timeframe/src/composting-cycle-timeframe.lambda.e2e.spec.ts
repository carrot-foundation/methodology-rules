import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDRecycledEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type DocumentEvent,
  type DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { compostingCycleTimeframeLambda } from './composting-cycle-timeframe.lambda';
import { compostingCycleTimeframeTestCases } from './composting-cycle-timeframe.test-cases';

describe('CompostingCycleTimeframeProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  it.each(compostingCycleTimeframeTestCases)(
    'should validate time interval between events - $scenario',
    async ({ dropOffEventDate, recycledEventDate, resultStatus }) => {
      const externalEvents = new Map<DocumentEventName, DocumentEvent>();

      if (dropOffEventDate) {
        externalEvents.set(
          'Drop-off' as DocumentEventName,
          stubBoldMassIDDropOffEvent({
            partialDocumentEvent: {
              externalCreatedAt: dropOffEventDate,
            },
          }),
        );
      }

      if (recycledEventDate) {
        externalEvents.set(
          'Recycled' as DocumentEventName,
          stubBoldMassIDRecycledEvent({
            partialDocumentEvent: {
              externalCreatedAt: recycledEventDate,
            },
          }),
        );
      }

      const { massIDAuditDocument, massIDDocument } = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: externalEvents,
        })
        .createMassIDAuditDocuments()
        .build();

      prepareEnvironmentTestE2E(
        [massIDDocument, massIDAuditDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await compostingCycleTimeframeLambda(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: massIDDocument.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
