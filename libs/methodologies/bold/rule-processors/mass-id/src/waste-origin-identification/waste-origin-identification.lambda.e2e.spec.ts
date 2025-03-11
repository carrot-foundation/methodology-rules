import type { DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';

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

  const { massIdAuditDocumentStub, massIdDocumentStub } =
    new BoldStubsBuilder().build();

  it.each(wasteOriginIdentificationTestCases)(
    'should validate waste origin identification - $scenario',
    async ({ pickUpEvent, resultStatus, wasteGeneratorEvent }) => {
      prepareEnvironmentTestE2E(
        [
          {
            ...massIdDocumentStub,
            externalEvents: [
              ...(massIdDocumentStub.externalEvents ?? []),
              pickUpEvent,
              wasteGeneratorEvent,
            ].filter((event): event is DocumentEvent => event !== undefined),
          },
          massIdAuditDocumentStub,
        ].map((document) => ({
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
          parentDocumentId: massIdDocumentStub.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
