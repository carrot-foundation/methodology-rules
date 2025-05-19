import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { uniquenessCheckLambda } from './uniqueness-check.lambda';
import {
  uniquenessCheckErrorTestCases,
  uniquenessCheckTestCases,
} from './uniqueness-check.test-cases';

const mockCheckDuplicateDocuments = jest.fn();
const mockAuditApiService = {
  checkDuplicateDocuments: mockCheckDuplicateDocuments,
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('./uniqueness-check.helpers', () => ({
  ...jest.requireActual('./uniqueness-check.helpers'),
  createAuditApiService: () => mockAuditApiService,
}));

describe('UniquenessCheckLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uniquenessCheckTestCases', () => {
    it.each(uniquenessCheckTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        newDuplicateDocuments,
        oldDuplicateDocuments,
        resultStatus,
      }) => {
        const { massIdAuditDocument, massIdDocument } = new BoldStubsBuilder()
          .createMassIdDocuments()
          .createMassIdAuditDocuments()
          .build();

        mockCheckDuplicateDocuments
          .mockResolvedValueOnce(newDuplicateDocuments)
          .mockResolvedValueOnce(oldDuplicateDocuments);

        prepareEnvironmentTestE2E(
          [massIdAuditDocument, massIdDocument].map((_document) => ({
            document: _document,
            documentKey: toDocumentKey({
              documentId: _document.id,
              documentKeyPrefix,
            }),
          })),
        );

        const response = (await uniquenessCheckLambda(
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

  describe('uniquenessCheckErrorTestCases', () => {
    it.each(uniquenessCheckErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({ massIdAuditDocument, massIdDocument, resultStatus }) => {
        prepareEnvironmentTestE2E(
          [massIdAuditDocument, massIdDocument].map((_document) => ({
            document: _document,
            documentKey: toDocumentKey({
              documentId: _document?.id,
              documentKeyPrefix,
            }),
          })),
        );

        const response = (await uniquenessCheckLambda(
          stubRuleInput({
            documentKeyPrefix,
            parentDocumentId: massIdDocument?.id ?? faker.string.uuid(),
          }),
          stubContext(),
          () => stubRuleResponse(),
        )) as RuleOutput;

        expect(response.resultStatus).toBe(resultStatus);
      },
    );
  });
});
