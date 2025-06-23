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

import { dropOffAtRecyclerLambda } from './drop-off-at-recycler.lambda';
import { dropOffAtRecyclerTestCases } from './drop-off-at-recycler.test-cases';

describe('DropOffAtRecyclerLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  it.each(dropOffAtRecyclerTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultStatus }) => {
      const { massIdAuditDocument, massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocuments({
          externalEventsMap: events,
        })
        .createMassIdAuditDocuments()
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

      const response = (await dropOffAtRecyclerLambda(
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
