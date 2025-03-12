import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { timeIntervalCheckLambda } from './time-interval-check.lambda';
import { timeIntervalTestCases } from './time-interval-check.test-cases';

describe('TimeIntervalCheckProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massId = new BoldStubsBuilder().build();

  it.each(timeIntervalTestCases)(
    'should validate time interval between events - $scenario',
    async ({ dropOffEventDate, recycledEventDate, resultStatus }) => {
      const externalEvents = [];

      if (dropOffEventDate) {
        externalEvents.push(
          stubDocumentEvent({
            externalCreatedAt: dropOffEventDate,
            name: DocumentEventName.DROP_OFF,
          }),
        );
      }

      if (recycledEventDate) {
        externalEvents.push(
          stubDocumentEvent({
            externalCreatedAt: recycledEventDate,
            name: DocumentEventName.RECYCLED,
          }),
        );
      }

      prepareEnvironmentTestE2E(
        [
          {
            ...massId.massIdDocumentStub,
            externalEvents,
          },
          massId.massIdAuditDocumentStub,
        ].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await timeIntervalCheckLambda(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: massId.massIdDocumentStub.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
