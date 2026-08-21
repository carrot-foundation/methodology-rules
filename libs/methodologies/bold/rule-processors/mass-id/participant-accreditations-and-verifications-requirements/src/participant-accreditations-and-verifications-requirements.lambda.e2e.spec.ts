import { toDocumentKey } from '@carrot-fndn/shared/helpers';
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
    vi.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(participantAccreditationsAndVerificationsRequirementsTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      documents,
      lambdaShouldReject,
      massIDAuditDocument,
      resultStatus,
    }) => {
      prepareEnvironmentTestE2E(
        [...documents, massIDAuditDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const responsePromise =
        participantAccreditationsAndVerificationsRequirementsLambda(
          stubRuleInput({
            documentId: massIDAuditDocument.id,
            documentKeyPrefix,
          }),
          stubContext(),
          () => stubRuleResponse(),
        );

      const [outcome] = await Promise.allSettled([responsePromise]);
      const rejectionOutcome = {
        reason: expect.any(Error),
        status: 'rejected',
      };
      const resolvedOutcome = {
        status: 'fulfilled',
        value: expect.objectContaining({ resultStatus }),
      };

      expect(outcome).toMatchObject(
        lambdaShouldReject ? rejectionOutcome : resolvedOutcome,
      );
    },
  );
});
