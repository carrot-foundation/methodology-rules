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

import { wasteMassIsUniqueLambda } from './waste-mass-is-unique.lambda';
import {
  wasteMassIsUniqueErrorTestCases,
  wasteMassIsUniqueTestCases,
} from './waste-mass-is-unique.test-cases';

const mockCheckDuplicateDocuments = jest.fn();
const mockAuditApiService = {
  checkDuplicateDocuments: mockCheckDuplicateDocuments,
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('./waste-mass-is-unique.helpers', () => ({
  ...jest.requireActual('./waste-mass-is-unique.helpers'),
  createAuditApiService: () => mockAuditApiService,
}));

describe('WasteMassIsUniqueLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('wasteMassIsUniqueTestCases', () => {
    it.each(wasteMassIsUniqueTestCases)(
      'should return $resultStatus when $scenario',
      async ({
        newDuplicateDocuments,
        oldDuplicateDocuments,
        resultStatus,
      }) => {
        const { massIDAuditDocument, massIDDocument } = new BoldStubsBuilder()
          .createMassIDDocuments()
          .createMassIDAuditDocuments()
          .build();

        mockCheckDuplicateDocuments
          .mockResolvedValueOnce(newDuplicateDocuments)
          .mockResolvedValueOnce(oldDuplicateDocuments);

        prepareEnvironmentTestE2E(
          [massIDAuditDocument, massIDDocument].map((_document) => ({
            document: _document,
            documentKey: toDocumentKey({
              documentId: _document.id,
              documentKeyPrefix,
            }),
          })),
        );

        const response = (await wasteMassIsUniqueLambda(
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

  describe('wasteMassIsUniqueErrorTestCases', () => {
    it.each(wasteMassIsUniqueErrorTestCases)(
      'should return $resultStatus when $scenario',
      async ({ massIDAuditDocument, massIDDocument, resultStatus }) => {
        prepareEnvironmentTestE2E(
          [massIDAuditDocument, massIDDocument].map((_document) => ({
            document: _document,
            documentKey: toDocumentKey({
              documentId: _document?.id,
              documentKeyPrefix,
            }),
          })),
        );

        const response = (await wasteMassIsUniqueLambda(
          stubRuleInput({
            documentKeyPrefix,
            parentDocumentId: massIDDocument?.id ?? faker.string.uuid(),
          }),
          stubContext(),
          () => stubRuleResponse(),
        )) as RuleOutput;

        expect(response.resultStatus).toBe(resultStatus);
      },
    );
  });
});
