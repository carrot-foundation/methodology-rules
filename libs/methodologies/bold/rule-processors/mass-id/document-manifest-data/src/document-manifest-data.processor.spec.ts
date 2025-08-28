import { logger } from '@carrot-fndn/shared/helpers';
import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { DocumentManifestDataProcessor } from './document-manifest-data.processor';
import {
  documentManifestDataTestCases,
  exceptionTestCases,
} from './document-manifest-data.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('DocumentManifestDataProcessor', () => {
  const documentLoaderService = jest.mocked(loadDocument);

  beforeEach(() => {
    process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] = 'test-bucket';
  });

  afterEach(() => {
    delete process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];
  });

  it.each([...exceptionTestCases, ...documentManifestDataTestCases])(
    'should return $resultStatus when $scenario',
    async ({ documentManifestType, events, resultComment, resultStatus }) => {
      const ruleDataProcessor = new DocumentManifestDataProcessor({
        aiParameters: {},
        documentManifestType,
      });

      const ruleInput = random<Required<RuleInput>>();

      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocuments({
          externalEventsMap: events,
        })
        .build();

      documentLoaderService.mockResolvedValueOnce(massIdDocument);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );

  describe('Error handling', () => {
    it('should throw error when DOCUMENT_ATTACHMENT_BUCKET_NAME is not set', async () => {
      delete process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];

      const ruleDataProcessor = new DocumentManifestDataProcessor({
        aiParameters: {},
        documentManifestType: DocumentEventName.TRANSPORT_MANIFEST,
      });
      const ruleInput = random<Required<RuleInput>>();
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocuments({
          externalEventsMap: {},
        })
        .build();

      documentLoaderService.mockResolvedValueOnce(massIdDocument);

      await expect(ruleDataProcessor.process(ruleInput)).rejects.toThrow(
        'DOCUMENT_ATTACHMENT_BUCKET_NAME environment variable is required',
      );
    });
  });

  describe('AI Validation', () => {
    it('should call AI validation when enabled', async () => {
      process.env['VALIDATE_ATTACHMENTS_CONSISTENCY_WITH_AI'] = 'true';

      const loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();

      const ruleDataProcessor = new DocumentManifestDataProcessor({
        aiParameters: {},
        documentManifestType: DocumentEventName.TRANSPORT_MANIFEST,
      });
      const ruleInput = random<Required<RuleInput>>();
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocuments({
          externalEventsMap: {},
        })
        .build();

      documentLoaderService.mockResolvedValueOnce(massIdDocument);
      await ruleDataProcessor.process(ruleInput);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'AI validation failed for document manifest type',
        ),
      );

      loggerWarnSpy.mockRestore();
      delete process.env['VALIDATE_ATTACHMENTS_CONSISTENCY_WITH_AI'];
    });
  });
});
