import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker/.';

import { vehicleIdentificationLambda } from './vehicle-identification.lambda';
import { vehicleIdentificationTestCases } from './vehicle-identification.test-cases';

jest.setTimeout(100_000);

describe('VehicleIdentificationLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  it.each(vehicleIdentificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultStatus }) => {
      const { massIdAuditDocumentStub, massIdDocumentStub } =
        new BoldStubsBuilder()
          .createMassIdDocumentStub({
            externalEventsMap: events,
          })
          .createMassIdAuditDocumentStub()
          .build();

      prepareEnvironmentTestE2E(
        [massIdDocumentStub, massIdAuditDocumentStub].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await vehicleIdentificationLambda(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: massIdDocumentStub.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultComment).toBe(resultComment);
      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
