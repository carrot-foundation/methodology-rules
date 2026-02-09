import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleInput } from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { crossValidateWithTextract } from './document-manifest-data.extractor';
import { DocumentManifestDataProcessor } from './document-manifest-data.processor';
import {
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
      failMessages: [],
      reviewReasons: [],
      reviewRequired: false,
    });
  });

  afterEach(() => {
    delete process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];
    jest.useRealTimers();
  });

  it.each([...exceptionTestCases, ...documentManifestDataTestCases])(
    'should return $resultStatus when $scenario',
    async (testCase) => {
      const { documentManifestType, events, resultComment, resultStatus } =
        testCase;

      if ('crossValidationFailMessages' in testCase) {
        crossValidateWithTextractMock.mockResolvedValueOnce({
          failMessages: testCase.crossValidationFailMessages,
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
    },
  );
});
