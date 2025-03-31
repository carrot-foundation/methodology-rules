import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdRecycledEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type DocumentEvent,
  DocumentEventName,
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

const { DROP_OFF, RECYCLED } = DocumentEventName;

describe('TimeIntervalCheckProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  it.each(compostingCycleTimeframeTestCases)(
    'should validate time interval between events - $scenario',
    async ({ dropOffEventDate, recycledEventDate, resultStatus }) => {
      const externalEvents = new Map<DocumentEventName, DocumentEvent>();

      if (dropOffEventDate) {
        externalEvents.set(
          DROP_OFF,
          stubBoldMassIdDropOffEvent({
            partialDocumentEvent: {
              externalCreatedAt: dropOffEventDate,
            },
          }),
        );
      }

      if (recycledEventDate) {
        externalEvents.set(
          RECYCLED,
          stubBoldMassIdRecycledEvent({
            partialDocumentEvent: {
              externalCreatedAt: recycledEventDate,
            },
          }),
        );
      }

      const { massIdAuditDocument, massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument({
          externalEventsMap: externalEvents,
        })
        .createMassIdAuditDocument()
        .build();

      prepareEnvironmentTestE2E(
        [massIdDocument, massIdAuditDocument].map((document) => ({
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
          parentDocumentId: massIdDocument.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
