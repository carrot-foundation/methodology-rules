import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { RECYCLED_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { BoldMethodologySlug } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { noConflictingCertificateOrCreditLambda } from './no-conflicting-certificate-or-credit.lambda';
import { noConflictingCertificateOrCreditTestCases } from './no-conflicting-certificate-or-credit.test-cases';

describe('NoConflictingCertificateOrCreditProcessor E2E', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const lambda = noConflictingCertificateOrCreditLambda(
    RECYCLED_ID,
    BoldMethodologySlug.RECYCLING,
  );
  const documentKeyPrefix = faker.string.uuid();

  it.each(noConflictingCertificateOrCreditTestCases)(
    'should return $resultStatus when $scenario',
    async ({ documents, massIDAuditDocument, resultComment, resultStatus }) => {
      const allDocuments = [...documents, massIDAuditDocument];

      prepareEnvironmentTestE2E(
        allDocuments.map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await lambda(
        stubRuleInput({
          documentId: massIDAuditDocument.id,
          documentKeyPrefix,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultComment).toBe(resultComment);
      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});
