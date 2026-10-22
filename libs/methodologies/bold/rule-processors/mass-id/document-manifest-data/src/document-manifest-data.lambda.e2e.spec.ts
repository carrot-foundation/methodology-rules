import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
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
import { ruleDefinition } from './document-manifest-data.rule-definition';
import {
  approvedIssueDateExceptionTestCases,
  buildApprovedIssueDateExceptionDocuments,
  documentManifestDataTestCases,
  exceptionTestCases,
} from './document-manifest-data.test-cases';

vi.mock('./document-manifest-data.extractor');

vi.mock('@carrot-fndn/shared/env', () => ({
  getArtifactChecksum: () => 'test-checksum',
  getAwsRegion: () => 'us-east-1',
  getDocumentAttachmentBucketName: () => mockBucketName,
  getDocumentBucketName: () => 'test-bucket',
  getEnvironment: () => 'development',
  getNodeEnv: () => 'test',
  getOptionalEnv: vi.fn(),
  getSentryDsn: () => undefined,
  getSmaugApiGatewayAssumeRoleArn: () =>
    'arn:aws:iam::123456789012:role/carrot-test-smaug-api-gateway',
  getSourceCodeUrl: () => 'https://test.example.com/repo',
  getSourceCodeVersion: () => 'test-version',
}));

let mockBucketName: string | undefined = 'test-bucket';

describe('DocumentManifestDataLambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  beforeEach(() => {
    mockBucketName = 'test-bucket';
    vi.mocked(crossValidateWithTextract).mockResolvedValue({
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
    mockBucketName = undefined;
    vi.useRealTimers();
  });

  it.each(approvedIssueDateExceptionTestCases)(
    'should load recycler exceptions through the audit for $scenario',
    async (testCase) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
      const { accreditation, massIDAuditDocument, massIDDocument } =
        buildApprovedIssueDateExceptionDocuments(testCase);

      expect(ruleDefinition).toHaveProperty(
        'input',
        PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
      );
      prepareEnvironmentTestE2E(
        [massIDDocument, massIDAuditDocument, accreditation].map(
          (document) => ({
            document,
            documentKey: toDocumentKey({
              documentId: document.id,
              documentKeyPrefix,
            }),
          }),
        ),
      );
      const response = await documentManifestDataLambda({
        documentManifestType: 'Recycling Manifest',
      })(
        stubRuleInput({
          documentId: massIDAuditDocument.id,
          documentKeyPrefix,
          parentDocumentId: massIDDocument.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      );

      expect(response).toMatchObject({ resultStatus: testCase.expected });
    },
  );

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
          documentId: massIDAuditDocument.id,
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
