import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  BoldStubsBuilder,
  expectRuleFindings,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  BoldAttributeName,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { RESULT_COMMENTS } from './document-manifest-data.constants';
import { crossValidateWithTextract } from './document-manifest-data.extractor';
import { DOCUMENT_MANIFEST_DATA_FINDINGS } from './document-manifest-data.findings';
import { DocumentManifestDataProcessor } from './document-manifest-data.processor';
import {
  crossValidationTestCases,
  documentManifestDataTestCases,
  exceptionTestCases,
} from './document-manifest-data.test-cases';

const { DOCUMENT_NUMBER, DOCUMENT_TYPE } = BoldAttributeName;
const { RECYCLING_MANIFEST } = BoldDocumentEventName;

type DocumentManifestDataTestCase =
  (typeof documentManifestDataTestCases)[number];

const findTestCase = (
  testCases: DocumentManifestDataTestCase[],
  scenario: string,
): DocumentManifestDataTestCase => {
  const testCase = testCases.find(
    (candidate) => candidate.scenario === scenario,
  );

  if (testCase === undefined) {
    throw new Error(`Test case "${scenario}" not found`);
  }

  return testCase;
};

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');
vi.mock('./document-manifest-data.extractor');

vi.mock('@carrot-fndn/shared/env', () => ({
  getDocumentAttachmentBucketName: () => mockBucketName,
  getDocumentBucketName: () => 'test-bucket',
}));

let mockBucketName: string | undefined = 'test-bucket';

describe('DocumentManifestDataProcessor', () => {
  const documentLoaderService = vi.mocked(loadDocument);
  const crossValidateWithTextractMock = vi.mocked(crossValidateWithTextract);

  beforeEach(() => {
    mockBucketName = 'test-bucket';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    crossValidateWithTextractMock.mockResolvedValue({
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

  it('should throw when documentManifestType is invalid', () => {
    expect(
      () =>
        new DocumentManifestDataProcessor({
          documentManifestType: 'INVALID' as never,
        }),
    ).toThrow('Invalid documentManifestType "INVALID"');
  });

  const processTestCase = async ({
    crossValidationFailReasons: failReasons = [],
    crossValidationPassMessages: passMessages = [],
    crossValidationReviewReasons: reviewReasons = [],
    documentManifestType,
    events,
  }: DocumentManifestDataTestCase): Promise<{
    ruleInput: ReturnType<typeof stubRuleInput>;
    ruleOutput: RuleOutput;
  }> => {
    crossValidateWithTextractMock.mockResolvedValue({
      crossValidation: {},
      extractionMetadata: {},
      failMessages: failReasons.map(({ description }) => description),
      failReasons,
      passMessages,
      reviewReasons,
      reviewRequired: reviewReasons.length > 0,
    });

    const ruleInput = stubRuleInput();
    const { massIDDocument } = new BoldStubsBuilder()
      .createMassIDDocuments({
        externalEventsMap: events,
      })
      .build();

    documentLoaderService.mockResolvedValueOnce(massIDDocument);

    const ruleOutput = await new DocumentManifestDataProcessor({
      documentManifestType,
    }).process(ruleInput);

    return { ruleInput, ruleOutput };
  };

  it.each([
    ...exceptionTestCases,
    ...documentManifestDataTestCases,
    ...crossValidationTestCases,
  ])('should return $resultStatus when $scenario', async (testCase) => {
    const { resultComment, resultStatus } = testCase;
    const { ruleInput, ruleOutput } = await processTestCase(testCase);

    expect(ruleOutput.requestId).toBe(ruleInput.requestId);
    expect(ruleOutput.responseToken).toBe(ruleInput.responseToken);
    expect(ruleOutput.responseUrl).toBe(ruleInput.responseUrl);
    expect(ruleOutput.resultStatus).toBe(resultStatus);
    expect(ruleOutput.resultComment).toContain(
      resultComment.split('.')[0] ?? '',
    );
    expectRuleFindings(ruleOutput, DOCUMENT_MANIFEST_DATA_FINDINGS);
  });

  it('should return one finding per joined failure message in the same order', async () => {
    const { ruleOutput } = await processTestCase(
      findTestCase(
        documentManifestDataTestCases,
        `The MassID document has a ${RECYCLING_MANIFEST} event without a ${DOCUMENT_NUMBER} and ${DOCUMENT_TYPE}`,
      ),
    );

    expect(ruleOutput.resultComment).toBe(
      `${RESULT_COMMENTS.MISSING_DOCUMENT_TYPE} ${RESULT_COMMENTS.MISSING_DOCUMENT_NUMBER}`,
    );
    expect(ruleOutput.resultContent?.['findings']).toEqual([
      DOCUMENT_MANIFEST_DATA_FINDINGS.finding('RESULT.MISSING_DOCUMENT_TYPE'),
      DOCUMENT_MANIFEST_DATA_FINDINGS.finding('RESULT.MISSING_DOCUMENT_NUMBER'),
    ]);
  });

  it('should return the CROSS_VALIDATION finding of each review reason when cross-validation requires review', async () => {
    const testCase = findTestCase(
      crossValidationTestCases,
      'Cross-validation requires review',
    );
    const { ruleOutput } = await processTestCase(testCase);

    expect(ruleOutput.resultStatus).toBe('REVIEW_REQUIRED');
    expect(ruleOutput.resultContent).toMatchObject({
      findings: (testCase.crossValidationReviewReasons ?? []).map(
        ({ code }) => ({
          code: `document-manifest-data.CROSS_VALIDATION.${code}`,
        }),
      ),
    });
    expect(ruleOutput.resultContent?.['findings']).toEqual([
      DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'CROSS_VALIDATION.VEHICLE_PLATE_MISMATCH',
      ),
      DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'CROSS_VALIDATION.FIELD_NOT_EXTRACTED',
      ),
    ]);
  });

  it('should return the fail reason findings before the review reason findings when cross-validation fails', async () => {
    const { ruleOutput } = await processTestCase(
      findTestCase(
        crossValidationTestCases,
        'Cross-validation finds mismatches and also requires review for other fields',
      ),
    );

    expect(ruleOutput.resultContent?.['findings']).toEqual([
      DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'CROSS_VALIDATION.DOCUMENT_NUMBER_MISMATCH',
      ),
      DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'CROSS_VALIDATION.VEHICLE_PLATE_MISMATCH',
      ),
    ]);
  });

  it('should return the extraction failure finding when the document extraction fails', async () => {
    const { ruleOutput } = await processTestCase(
      findTestCase(crossValidationTestCases, 'The document extraction fails'),
    );

    expect(ruleOutput.resultStatus).toBe('FAILED');
    expect(ruleOutput.resultContent?.['findings']).toEqual([
      DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'DOCUMENT_EXTRACTION.EXTRACTION_FAILED',
      ),
    ]);
  });

  it('should return the extraction confidence finding when review is required without a review reason', async () => {
    const testCase = findTestCase(
      crossValidationTestCases,
      'Cross-validation requires review',
    );

    crossValidateWithTextractMock.mockResolvedValue({
      crossValidation: {},
      extractionMetadata: {},
      failMessages: [],
      failReasons: [],
      passMessages: [],
      reviewReasons: [],
      reviewRequired: true,
    });

    const { massIDDocument } = new BoldStubsBuilder()
      .createMassIDDocuments({ externalEventsMap: testCase.events })
      .build();

    documentLoaderService.mockResolvedValueOnce(massIDDocument);

    const ruleOutput = await new DocumentManifestDataProcessor({
      documentManifestType: testCase.documentManifestType,
    }).process(stubRuleInput());

    expect(ruleOutput.resultStatus).toBe('REVIEW_REQUIRED');
    expect(ruleOutput.resultContent?.['findings']).toEqual([
      DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
        'CROSS_VALIDATION.DOCUMENT_EXTRACTION_CONFIDENCE_LOW',
      ),
    ]);
  });
});
