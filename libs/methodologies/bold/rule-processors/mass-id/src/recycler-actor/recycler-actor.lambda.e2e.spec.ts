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

import { recyclerActorLambda } from './recycler-actor.lambda';
import { recyclerActorProcessorTestCases } from './recycler-actor.test-cases';

describe('RecyclerActorProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massId = new BoldStubsBuilder().build();

  it.each(recyclerActorProcessorTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultStatus }) => {
      prepareEnvironmentTestE2E(
        [
          {
            ...massId.massIdDocumentStub,
            externalEvents: [
              ...(massId.massIdDocumentStub.externalEvents ?? []),
              ...events,
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

      const response = (await recyclerActorLambda(
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
