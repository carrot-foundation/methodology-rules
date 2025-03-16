import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { checkParticipantsHomologationLambda } from './check-participants-homologation.lambda';
import { checkParticipantsHomologationTestCases } from './check-participants-homologation.test-cases';

describe('CheckParticipantsHomologationProcessor E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(checkParticipantsHomologationTestCases)(
    'should return $resultStatus when $scenario',
    async ({ documents, massIdAuditDocumentStub, resultStatus }) => {
      prepareEnvironmentTestE2E(
        [...documents, massIdAuditDocumentStub].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await checkParticipantsHomologationLambda(
        stubRuleInput({
          documentId: massIdAuditDocumentStub.id,
          documentKeyPrefix,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
