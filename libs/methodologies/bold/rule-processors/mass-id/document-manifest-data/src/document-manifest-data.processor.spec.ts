import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  CLOUDWATCH_CONSTANTS,
  CloudWatchMetricsService,
} from '@carrot-fndn/shared/cloudwatch-metrics';
import { logger } from '@carrot-fndn/shared/helpers';
import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    delete process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];
    jest.useRealTimers();
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
          'AI attachment validation failed for document manifest type',
        ),
      );

      loggerWarnSpy.mockRestore();
      delete process.env['VALIDATE_ATTACHMENTS_CONSISTENCY_WITH_AI'];
    });

    it('should put metric to cloud watch service when validation fails', async () => {
      jest
        .spyOn(CloudWatchMetricsService.prototype, 'isEnabled')
        .mockReturnValue(true);
      const cloudWatchMock = mockClient(CloudWatchClient);

      cloudWatchMock.on(PutMetricDataCommand).resolves({});

      process.env['VALIDATE_ATTACHMENTS_CONSISTENCY_WITH_AI'] = 'true';

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

      expect(cloudWatchMock).toHaveReceivedCommandWith(PutMetricDataCommand, {
        MetricData: [
          {
            Dimensions: [
              {
                Name: CLOUDWATCH_CONSTANTS.DIMENSION_NAME,
                Value: DocumentEventName.TRANSPORT_MANIFEST,
              },
            ],
            MetricName: CLOUDWATCH_CONSTANTS.METRIC_NAME,
            Timestamp: new Date('2025-01-01T00:00:00Z'),
            Unit: CLOUDWATCH_CONSTANTS.METRIC_UNIT,
            Value: CLOUDWATCH_CONSTANTS.METRIC_VALUE,
          },
        ],
        Namespace: CLOUDWATCH_CONSTANTS.DEFAULT_NAMESPACE,
      });

      delete process.env['VALIDATE_ATTACHMENTS_CONSISTENCY_WITH_AI'];
    });
  });
});
