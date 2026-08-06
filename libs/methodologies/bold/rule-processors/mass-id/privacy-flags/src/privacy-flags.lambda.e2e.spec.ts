import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { BoldDocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { privacyFlagsLambda } from './privacy-flags.lambda';
import {
  conformantEvent,
  conformantExternalEventsMap,
} from './privacy-flags.test-cases';

const { PICK_UP } = BoldDocumentEventName;

describe('PrivacyFlagsLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  it.each([
    {
      externalEventsMap: conformantExternalEventsMap(),
      resultStatus: 'PASSED',
      scenario: 'all privacy flags match the methodology specification',
    },
    {
      externalEventsMap: {
        ...conformantExternalEventsMap(),
        [PICK_UP]: { ...conformantEvent(PICK_UP), isPublic: false },
      },
      resultStatus: 'FAILED',
      scenario: 'the Pick-up event declares isPublic as false',
    },
  ])(
    'should return $resultStatus when $scenario',
    async ({ externalEventsMap, resultStatus }) => {
      const { massIDAuditDocument, massIDDocument } = new BoldStubsBuilder()
        .createMassIDDocuments({ externalEventsMap })
        .createMassIDAuditDocuments()
        .build();

      prepareEnvironmentTestE2E(
        [massIDDocument, massIDAuditDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await privacyFlagsLambda(
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
