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

import { massIdDefinitionLambda } from './mass-id-definition.lambda';
import { massIdDefinitionTestCases } from './mass-id-definition.test-cases';

describe('MassIdDefinitionLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massId = new BoldStubsBuilder()
    .createMassIdDocuments()
    .createMassIdAuditDocuments()
    .build();

  it.each(massIdDefinitionTestCases)(
    'should return $resultStatus when $scenario',
    async ({ massIdDocument, resultStatus }) => {
      prepareEnvironmentTestE2E(
        [massIdDocument, massId.massIdAuditDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await massIdDefinitionLambda(
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
