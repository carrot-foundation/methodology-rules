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

import { massIdQualificationsLambda } from './mass-id-qualifications.lambda';
import { massIdQualificationsTestCases } from './mass-id-qualifications.test-cases';

describe('MassIdQualificationsLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massId = new BoldStubsBuilder()
    .createMassIdDocuments()
    .createMassIdAuditDocuments()
    .build();

  it.each(massIdQualificationsTestCases)(
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

      const response = (await massIdQualificationsLambda(
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
