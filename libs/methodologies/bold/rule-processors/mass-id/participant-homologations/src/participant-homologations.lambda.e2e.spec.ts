import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { participantHomologationsLambda } from './participant-homologations.lambda';
import { participantHomologationsTestCases } from './participant-homologations.test-cases';

describe('ParticipantHomologationsProcessor E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const documentKeyPrefix = faker.string.uuid();

  it.each(participantHomologationsTestCases)(
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

      const response = (await participantHomologationsLambda(
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
