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

import { massIDQualificationsLambda } from './mass-id-qualifications.lambda';
import { massIDQualificationsTestCases } from './mass-id-qualifications.test-cases';

describe('MassIDQualificationsLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massID = new BoldStubsBuilder()
    .createMassIDDocuments()
    .createMassIDAuditDocuments()
    .build();

  it.each(massIDQualificationsTestCases)(
    'should return $resultStatus when $scenario',
    async ({ massIDDocument, resultStatus }) => {
      prepareEnvironmentTestE2E(
        [massIDDocument, massID.massIDAuditDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await massIDQualificationsLambda(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: massIDDocument.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
