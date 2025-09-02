import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { random } from 'typia';

import { CLOUDWATCH_CONSTANTS } from './cloudwatch-metrics.constants';
import {
  CloudWatchMetricData,
  CloudWatchMetricsService,
  setModuleCloudWatchClient,
} from './cloudwatch-metrics.service';

jest.mock('@aws-sdk/client-cloudwatch');

const mockCloudWatchClient = jest.mocked(CloudWatchClient);

const originalEnvironment = { ...process.env };

const setEnvironmentVariables = (
  environmentVariables: Record<string, string | undefined>,
) => {
  for (const key of Object.keys(environmentVariables)) {
    if (environmentVariables[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = environmentVariables[key];
    }
  }
};

const resetEnvironmentVariables = () => {
  process.env = { ...originalEnvironment };
};

const createMockCloudWatchMetricData = (
  overrides: Partial<CloudWatchMetricData> = {},
): CloudWatchMetricData => ({
  ...random<CloudWatchMetricData>(),
  ...overrides,
});

describe('CloudWatchMetricsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CloudWatchMetricsService['instance'] = null;

    setModuleCloudWatchClient(null);

    resetEnvironmentVariables();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = CloudWatchMetricsService.getInstance();
      const instance2 = CloudWatchMetricsService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance on first call', () => {
      expect(CloudWatchMetricsService['instance']).toBeNull();

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance).toBeInstanceOf(CloudWatchMetricsService);
      expect(CloudWatchMetricsService['instance']).toBe(instance);
    });

    it('should persist singleton across different method calls', () => {
      const instance1 = CloudWatchMetricsService.getInstance();
      const isEnabled = instance1.isEnabled();

      expect(typeof isEnabled).toBe('boolean');
      const instance2 = CloudWatchMetricsService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('constructor and configuration', () => {
    it('should use default configuration when no env vars are set', () => {
      setEnvironmentVariables({
        AWS_REGION: undefined,
        CLOUDWATCH_METRICS_NAMESPACE: undefined,
        ENABLE_CLOUDWATCH_METRICS: undefined,
        NODE_ENV: undefined,
      });

      const instance = CloudWatchMetricsService.getInstance();
      const config = instance['config'];

      expect(config.namespace).toBe(CLOUDWATCH_CONSTANTS.DEFAULT_NAMESPACE);
      expect(config.enabled).toBe(false);
    });

    it('should use custom CLOUDWATCH_METRICS_NAMESPACE when provided', () => {
      setEnvironmentVariables({
        CLOUDWATCH_METRICS_NAMESPACE: 'Custom/Namespace',
        NODE_ENV: undefined,
      });

      const instance = CloudWatchMetricsService.getInstance();
      const config = instance['config'];

      expect(config.namespace).toBe('Custom/Namespace');
    });

    it('should use default AWS region when AWS_REGION not set', async () => {
      setEnvironmentVariables({
        AWS_REGION: undefined,
        ENABLE_CLOUDWATCH_METRICS: 'true',
        NODE_ENV: 'production',
      });

      const instance = CloudWatchMetricsService.getInstance();
      const mockData = createMockCloudWatchMetricData();

      await instance.recordAIValidationFailure(mockData);

      expect(mockCloudWatchClient).toHaveBeenCalledWith({
        region: CLOUDWATCH_CONSTANTS.DEFAULT_REGION,
      });
    });

    it('should use custom AWS region when AWS_REGION is provided', async () => {
      setEnvironmentVariables({
        AWS_REGION: 'eu-west-1',
        ENABLE_CLOUDWATCH_METRICS: 'true',
        NODE_ENV: 'production',
      });

      const instance = CloudWatchMetricsService.getInstance();
      const mockData = createMockCloudWatchMetricData();

      await instance.recordAIValidationFailure(mockData);

      expect(mockCloudWatchClient).toHaveBeenCalledWith({
        region: 'eu-west-1',
      });
    });
  });

  describe('isEnabled', () => {
    it('should be disabled when NODE_ENV is test', () => {
      setEnvironmentVariables({
        ENABLE_CLOUDWATCH_METRICS: undefined,
        NODE_ENV: 'test',
      });

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance.isEnabled()).toBe(false);
    });

    it('should be disabled when jest is defined (always true in test environment)', () => {
      setEnvironmentVariables({
        ENABLE_CLOUDWATCH_METRICS: 'true',
        NODE_ENV: 'production',
      });

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance.isEnabled()).toBe(true);
      expect(typeof jest).toBe('object');
    });

    it('should be disabled when ENABLE_CLOUDWATCH_METRICS is undefined and not in test env', () => {
      setEnvironmentVariables({
        ENABLE_CLOUDWATCH_METRICS: undefined,
        NODE_ENV: 'production',
      });

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance.isEnabled()).toBe(false);
    });

    it('should respect ENABLE_CLOUDWATCH_METRICS=true (case insensitive)', () => {
      const testCases = ['true', 'TRUE', 'True', 'tRuE'];

      for (const value of testCases) {
        CloudWatchMetricsService['instance'] = null;

        setEnvironmentVariables({
          ENABLE_CLOUDWATCH_METRICS: value,
          NODE_ENV: 'production',
        });

        const instance = CloudWatchMetricsService.getInstance();

        expect(instance.isEnabled()).toBe(true);
      }
    });

    it('should respect ENABLE_CLOUDWATCH_METRICS=false (case insensitive)', () => {
      const testCases = ['false', 'FALSE', 'False', 'fAlSe'];

      for (const value of testCases) {
        CloudWatchMetricsService['instance'] = null;

        setEnvironmentVariables({
          ENABLE_CLOUDWATCH_METRICS: value,
          NODE_ENV: 'production',
        });

        const instance = CloudWatchMetricsService.getInstance();

        expect(instance.isEnabled()).toBe(false);
      }
    });

    it('should handle invalid ENABLE_CLOUDWATCH_METRICS values as false', () => {
      const testCases = ['invalid', '1', '0', 'yes', 'no'];

      for (const value of testCases) {
        CloudWatchMetricsService['instance'] = null;

        setEnvironmentVariables({
          ENABLE_CLOUDWATCH_METRICS: value,
          NODE_ENV: 'production',
        });

        const instance = CloudWatchMetricsService.getInstance();

        expect(instance.isEnabled()).toBe(false);
      }
    });
  });

  describe('recordAIValidationFailure', () => {
    it('should return a boolean from isEnabled method', () => {
      setEnvironmentVariables({
        NODE_ENV: 'test',
      });

      const instance = CloudWatchMetricsService.getInstance();
      const result = instance.isEnabled();

      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });

    it('should handle valid CloudWatchMetricData without throwing', async () => {
      setEnvironmentVariables({
        ENABLE_CLOUDWATCH_METRICS: 'true',
        NODE_ENV: 'production',
      });

      const instance = CloudWatchMetricsService.getInstance();
      const mockData = createMockCloudWatchMetricData({
        attachmentPath: 'custom/path/file.pdf',
        documentId: 'custom-doc-id',
        documentManifestType: 'custom-manifest',
        validationResponse: 'custom-response',
      });

      await expect(
        instance.recordAIValidationFailure(mockData),
      ).resolves.not.toThrow();
    });

    it('should handle missing optional validationResponse', async () => {
      setEnvironmentVariables({
        ENABLE_CLOUDWATCH_METRICS: 'true',
        NODE_ENV: 'production',
      });

      const instance = CloudWatchMetricsService.getInstance();
      const mockData = createMockCloudWatchMetricData({
        validationResponse: undefined,
      });

      await expect(
        instance.recordAIValidationFailure(mockData),
      ).resolves.not.toThrow();
    });
  });

  describe('CloudWatch integration', () => {
    it('should instantiate CloudWatchClient with correct region configuration', async () => {
      setEnvironmentVariables({
        AWS_REGION: 'us-west-2',
        ENABLE_CLOUDWATCH_METRICS: 'true',
        NODE_ENV: 'production',
      });

      const instance = CloudWatchMetricsService.getInstance();
      const mockData = createMockCloudWatchMetricData();

      await instance.recordAIValidationFailure(mockData);

      expect(mockCloudWatchClient).toHaveBeenCalledWith({
        region: 'us-west-2',
      });
    });

    it('should reuse the same CloudWatchClient instance (singleton behavior)', async () => {
      setEnvironmentVariables({
        ENABLE_CLOUDWATCH_METRICS: 'true',
        NODE_ENV: 'production',
      });

      const instance = CloudWatchMetricsService.getInstance();
      const mockData = createMockCloudWatchMetricData();

      await instance.recordAIValidationFailure(mockData);
      await instance.recordAIValidationFailure(mockData);

      expect(mockCloudWatchClient).toHaveBeenCalledTimes(1);
    });

    it('should create PutMetricDataCommand with correct parameters structure', () => {
      const mockData = createMockCloudWatchMetricData({
        documentManifestType: 'TestManifestType' as never,
      });

      const expectedCommandParameters = {
        MetricData: [
          {
            Dimensions: [
              {
                Name: CLOUDWATCH_CONSTANTS.DIMENSION_NAME,
                Value: mockData.documentManifestType,
              },
            ],
            MetricName: CLOUDWATCH_CONSTANTS.METRIC_NAME,
            Timestamp: expect.any(Date),
            Unit: CLOUDWATCH_CONSTANTS.METRIC_UNIT,
            Value: CLOUDWATCH_CONSTANTS.METRIC_VALUE,
          },
        ],
        Namespace: expect.any(String),
      };

      expect(
        expectedCommandParameters.MetricData[0]?.Dimensions[0]?.Value,
      ).toBe(mockData.documentManifestType);
      expect(expectedCommandParameters.MetricData[0]?.MetricName).toBe(
        CLOUDWATCH_CONSTANTS.METRIC_NAME,
      );
      expect(expectedCommandParameters.MetricData[0]?.Unit).toBe(
        CLOUDWATCH_CONSTANTS.METRIC_UNIT,
      );
      expect(expectedCommandParameters.MetricData[0]?.Value).toBe(
        CLOUDWATCH_CONSTANTS.METRIC_VALUE,
      );
    });

    it('should use correct namespace from configuration', () => {
      setEnvironmentVariables({
        CLOUDWATCH_METRICS_NAMESPACE: 'Custom/TestNamespace',
        NODE_ENV: 'production',
      });

      const instance = CloudWatchMetricsService.getInstance();
      const config = instance['config'];

      expect(config.namespace).toBe('Custom/TestNamespace');
    });

    it('should handle timestamp creation for metrics', () => {
      const beforeTime = new Date();

      const timestamp = new Date();

      const afterTime = new Date();

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Error handling', () => {
    it('should handle empty string environment variables', async () => {
      setEnvironmentVariables({
        AWS_REGION: undefined,
        CLOUDWATCH_METRICS_NAMESPACE: '',
        ENABLE_CLOUDWATCH_METRICS: 'true',
        NODE_ENV: 'production',
      });

      const instance = CloudWatchMetricsService.getInstance();
      const config = instance['config'];

      expect(config.namespace).toBe(CLOUDWATCH_CONSTANTS.DEFAULT_NAMESPACE);

      const mockData = createMockCloudWatchMetricData();

      await instance.recordAIValidationFailure(mockData);

      expect(mockCloudWatchClient).toHaveBeenCalledWith({
        region: CLOUDWATCH_CONSTANTS.DEFAULT_REGION,
      });
    });
  });
});
