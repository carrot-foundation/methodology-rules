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

import { crossValidateWithTextract } from './document-manifest-data.extractor';
import { documentManifestDataLambda } from './document-manifest-data.lambda';
import {
  documentManifestDataTestCases,
  exceptionTestCases,
} from './document-manifest-data.test-cases';

jest.mock('./document-manifest-data.extractor');

describe('DocumentManifestDataLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  beforeEach(() => {
    process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] = 'test-bucket';
    jest.mocked(crossValidateWithTextract).mockResolvedValue({
      crossValidation: {},
      extractionMetadata: {},
      failMessages: [],
      failReasons: [],
      passMessages: [],
      reviewReasons: [],
      reviewRequired: false,
    });
  });

  afterEach(() => {
    delete process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];
  });

  it.each([...documentManifestDataTestCases, ...exceptionTestCases])(
    'should return $resultStatus when $scenario',
    async ({ documentManifestType, events, resultStatus }) => {
      const lambda = documentManifestDataLambda({
        documentManifestType,
      });

      const { massIDAuditDocument, massIDDocument } = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: events,
        })
        .createMassIDAuditDocuments()
        .build();

      prepareEnvironmentTestE2E(
        [massIDDocument, massIDAuditDocument].map((document) => ({
          document,
          documentKey: toDocumentKey({
            documentId: document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await lambda(
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
