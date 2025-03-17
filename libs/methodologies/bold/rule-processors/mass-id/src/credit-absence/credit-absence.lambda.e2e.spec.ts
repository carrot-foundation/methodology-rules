import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { TRC_CREDIT_MATCH } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { creditAbsenceLambda } from './credit-absence.lambda';
import { creditAbsenceTestCases } from './credit-absence.test-cases';

describe('CheckTCCAbsenceProcessor E2E', () => {
  const lambda = creditAbsenceLambda(TRC_CREDIT_MATCH);
  const documentKeyPrefix = faker.string.uuid();

  it.each(creditAbsenceTestCases)(
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

      const response = (await lambda(
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
