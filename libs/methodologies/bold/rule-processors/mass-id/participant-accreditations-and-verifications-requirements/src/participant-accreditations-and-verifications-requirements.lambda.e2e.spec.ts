import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { participantAccreditationsAndVerificationsRequirementsLambda } from './participant-accreditations-and-verifications-requirements.lambda';
import { participantAccreditationsAndVerificationsRequirementsTestCases } from './participant-accreditations-and-verifications-requirements.test-cases';

describe('ParticipantAccreditationsAndVerificationsRequirementsProcessor E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(participantAccreditationsAndVerificationsRequirementsTestCases)(
    'should return $resultStatus when $scenario',
    async ({ documents, massIdAuditDocument, resultStatus }) => {
      prepareEnvironmentTestE2E(
        [...documents, massIdAuditDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response =
        (await participantAccreditationsAndVerificationsRequirementsLambda(
          stubRuleInput({
            documentId: massIdAuditDocument.id,
            documentKeyPrefix,
          }),
          stubContext(),
          () => stubRuleResponse(),
        )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
