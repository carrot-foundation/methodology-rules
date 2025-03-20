import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { dropOffAtRecyclingFacilityLambda } from './drop-off-at-recycling-facility.lambda';
import { dropOffAtRecyclingFacilityTestCases } from './drop-off-at-recycling-facility.test-cases';

describe('DropOffAtRecyclingFacilityLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  it.each(dropOffAtRecyclingFacilityTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultStatus }) => {
      const { massIdAuditDocument, massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument({
          externalEventsMap: events,
        })
        .createMassIdAuditDocument()
        .build();

      prepareEnvironmentTestE2E(
        [massIdAuditDocument, massIdDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await dropOffAtRecyclingFacilityLambda(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: massIdDocument.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultComment).toBe(resultComment);
      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
