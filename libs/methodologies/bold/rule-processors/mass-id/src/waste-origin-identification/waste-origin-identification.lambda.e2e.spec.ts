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

import { wasteOriginIdentificationLambda } from './waste-origin-identification.lambda';
import { wasteOriginIdentificationTestCases } from './waste-origin-identification.test-cases';

describe('WasteOriginIdentificationProcessor E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  it.each(wasteOriginIdentificationTestCases)(
    'should validate waste origin identification - $scenario',
    async ({ events, resultComment, resultStatus }) => {
      const { massIdAuditDocument, massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument({
          externalEventsMap: events,
        })
        .createMassIdAuditDocument()
        .build();

      prepareEnvironmentTestE2E(
        [massIdDocument, massIdAuditDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await wasteOriginIdentificationLambda(
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
