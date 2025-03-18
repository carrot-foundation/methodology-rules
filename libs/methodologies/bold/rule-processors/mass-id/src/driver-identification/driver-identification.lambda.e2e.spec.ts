import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { driverIdentificationLambda } from './driver-identification.lambda';
import { driverIdentificationTestCases } from './driver-identification.test-cases';

const { PICK_UP } = DocumentEventName;

describe('DriverIdentificationLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  it.each(driverIdentificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({ pickUpEvent, resultStatus }) => {
      const { massIdAuditDocument, massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument({
          externalEventsMap: {
            [PICK_UP]: pickUpEvent,
          },
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

      const response = (await driverIdentificationLambda(
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
