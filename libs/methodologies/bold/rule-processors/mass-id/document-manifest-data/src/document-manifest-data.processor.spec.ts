import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { crossValidateWithTextract } from './document-manifest-data.extractor';
import { DocumentManifestDataProcessor } from './document-manifest-data.processor';
import {
  crossValidationTestCases,
  documentManifestDataTestCases,
  exceptionTestCases,
} from './document-manifest-data.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');
jest.mock('./document-manifest-data.extractor');

describe('DocumentManifestDataProcessor', () => {
  const documentLoaderService = jest.mocked(loadDocument);
  const crossValidateWithTextractMock = jest.mocked(crossValidateWithTextract);

  beforeEach(() => {
    process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] = 'test-bucket';
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
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
    delete process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];
    jest.useRealTimers();
  });

  it('should throw when documentManifestType is invalid', () => {
    expect(
      () =>
        new DocumentManifestDataProcessor({
          documentManifestType: 'INVALID' as never,
        }),
    ).toThrow('Invalid documentManifestType "INVALID"');
  });

  it.each([
    ...exceptionTestCases,
    ...documentManifestDataTestCases,
    ...crossValidationTestCases,
  ])('should return $resultStatus when $scenario', async (testCase) => {
    const { documentManifestType, events, resultComment, resultStatus } =
      testCase;

    if (
      'crossValidationFailMessages' in testCase &&
      'crossValidationReviewReasons' in testCase
    ) {
      crossValidateWithTextractMock.mockResolvedValueOnce({
        crossValidation: {},
        extractionMetadata: {},
        failMessages: testCase.crossValidationFailMessages,
        failReasons: [],
        passMessages: [],
        reviewReasons: testCase.crossValidationReviewReasons,
        reviewRequired: true,
      });
    } else if ('crossValidationFailMessages' in testCase) {
      crossValidateWithTextractMock.mockResolvedValueOnce({
        crossValidation: {},
        extractionMetadata: {},
        failMessages: testCase.crossValidationFailMessages,
        failReasons: [],
        passMessages: [],
        reviewReasons: [],
        reviewRequired: false,
      });
    } else if ('crossValidationReviewReasons' in testCase) {
      crossValidateWithTextractMock.mockResolvedValueOnce({
        crossValidation: {},
        extractionMetadata: {},
        failMessages: [],
        failReasons: [],
        passMessages: [],
        reviewReasons: testCase.crossValidationReviewReasons,
        reviewRequired: true,
      });
    }

    if ('crossValidationPassMessages' in testCase) {
      crossValidateWithTextractMock.mockResolvedValueOnce({
        crossValidation: {},
        extractionMetadata: {},
        failMessages: [],
        failReasons: [],
        passMessages: testCase.crossValidationPassMessages,
        reviewReasons: [],
        reviewRequired: false,
      });
    }

    const ruleDataProcessor = new DocumentManifestDataProcessor({
      documentManifestType,
    });

    const ruleInput = random<Required<RuleInput>>();

    const { massIDDocument } = new BoldStubsBuilder()
      .createMassIDDocuments({
        externalEventsMap: events,
      })
      .build();

    documentLoaderService.mockResolvedValueOnce(massIDDocument);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput.requestId).toBe(ruleInput.requestId);
    expect(ruleOutput.responseToken).toBe(ruleInput.responseToken);
    expect(ruleOutput.responseUrl).toBe(ruleInput.responseUrl);
    expect(ruleOutput.resultStatus).toBe(resultStatus);
    expect(ruleOutput.resultComment).toContain(
      resultComment?.split('.')[0] ?? '',
    );
  });
});
