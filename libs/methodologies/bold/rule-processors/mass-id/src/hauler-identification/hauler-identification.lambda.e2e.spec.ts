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

import { haulerIdentificationLambda } from './hauler-identification.lambda';
import { haulerIdentificationTestCases } from './hauler-identification.test-cases';

describe('HaulerIdentificationProcessor E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(haulerIdentificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultStatus }) => {
      const massId = new BoldStubsBuilder()
        .createMassIdDocumentStub({
          externalEventsMap: events,
        })
        .createMassIdAuditDocumentStub()
        .build();

      prepareEnvironmentTestE2E(
        [massId.massIdDocumentStub, massId.massIdAuditDocumentStub].map(
          (document) => ({
            document,
            documentKey: toDocumentKey({
              documentId: document.id,
              documentKeyPrefix,
            }),
          }),
        ),
      );

      const response = (await haulerIdentificationLambda(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: massId.massIdDocumentStub.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultComment).toBe(resultComment);
      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
