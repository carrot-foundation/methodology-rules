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

import { massDefinitionLambda } from './mass-definition.lambda';
import { massDefinitionTestCases } from './mass-definition.test-cases';

describe('MassDefinitionLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massId = new BoldStubsBuilder()
    .createMassIdDocumentStub()
    .createMassIdAuditDocumentStub()
    .build();

  it.each(massDefinitionTestCases)(
    'should return $resultStatus when $scenario',
    async ({ massIdDocument, resultStatus }) => {
      prepareEnvironmentTestE2E(
        [massIdDocument, massId.massIdAuditDocumentStub].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await massDefinitionLambda(
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
