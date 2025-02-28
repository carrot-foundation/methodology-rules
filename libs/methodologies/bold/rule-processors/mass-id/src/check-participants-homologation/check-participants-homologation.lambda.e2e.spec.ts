import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { checkParticipantsHomologationLambda } from './check-participants-homologation.lambda';
import { createCheckParticipantsHomologationTestData } from './check-participants-homologation.stubs';

describe('CheckParticipantsHomologationProcessor', () => {
  const documentKeyPrefix = faker.string.uuid();

  const { documents, massAuditReference } =
    createCheckParticipantsHomologationTestData();

  beforeAll(() => {
    prepareEnvironmentTestE2E(
      documents.map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    );
  });

  it('should return APPROVED when the homologation document is not expired', async () => {
    const response = (await checkParticipantsHomologationLambda(
      stubRuleInput({
        documentId: massAuditReference.documentId,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as RuleOutput;

    expect(response.resultStatus).toBe(RuleOutputStatus.APPROVED);
  });
});
