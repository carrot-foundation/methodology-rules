import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { RECYCLED_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { BoldMethodologyName } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { certificateUniquenessCheckLambda } from './certificate-uniqueness-check.lambda';
import { certificateUniquenessCheckTestCases } from './certificate-uniqueness-check.test-cases';

describe('CertificateUniquenessCheckProcessor E2E', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const lambda = certificateUniquenessCheckLambda(
    RECYCLED_ID,
    BoldMethodologyName.RECYCLING,
  );
  const documentKeyPrefix = faker.string.uuid();

  it.each(certificateUniquenessCheckTestCases)(
    'should return $resultStatus when $scenario',
    async ({ documents, massIdAuditDocument, resultComment, resultStatus }) => {
      const allDocuments = [...documents, massIdAuditDocument];

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
          documentId: massIdAuditDocument.id,
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
