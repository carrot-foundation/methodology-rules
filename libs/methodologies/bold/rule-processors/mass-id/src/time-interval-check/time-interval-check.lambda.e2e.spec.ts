import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  BoldStubsBuilder,
  stubDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker/.';

import { timeIntervalCheckLambda } from './time-interval-check.lambda';

describe('TimeIntervalCheckProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massId = new BoldStubsBuilder().build();

  it.each([
    {
      dropOffEventDate: '2024-02-25T12:00:00.000Z',
      recycledEventDate: '2024-02-27T11:00:00.000Z',
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'Time interval is less than 60 days (2 days)',
    },
    {
      dropOffEventDate: undefined,
      recycledEventDate: '2024-02-27T12:00:00.000Z',
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'Drop off event date is missing',
    },
    {
      dropOffEventDate: '2023-11-25T12:00:00.000Z',
      recycledEventDate: '2024-02-27T11:00:00.000Z',
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'Time interval is within range (94 days)',
    },
    {
      dropOffEventDate: '2023-12-29T12:00:00.000Z',
      recycledEventDate: '2024-02-27T12:00:00.000Z',
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'Edge case: Exactly 60 days (minimum allowed)',
    },
    {
      dropOffEventDate: '2023-08-31T12:00:00.000Z',
      recycledEventDate: '2024-02-27T12:00:00.000Z',
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'Edge case: Exactly 180 days (maximum allowed)',
    },
    {
      dropOffEventDate: '2023-12-30T12:00:00.000Z',
      recycledEventDate: '2024-02-27T12:00:00.000Z',
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'Edge case: 59 days (just below minimum)',
    },
    {
      dropOffEventDate: '2023-08-30T12:00:00.000Z',
      recycledEventDate: '2024-02-27T12:00:00.000Z',
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'Edge case: 181 days (just above maximum)',
    },
    {
      dropOffEventDate: '2023-11-25T12:00:00.000Z',
      recycledEventDate: undefined,
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'Recycled event date is missing',
    },
  ])(
    'should validate time interval between events - $scenario',
    async ({ dropOffEventDate, recycledEventDate, resultStatus }) => {
      prepareEnvironmentTestE2E(
        [
          {
            ...massId.massIdDocumentStub,
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
