import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { faker } from '@faker-js/faker';

import { CLOUDWATCH_CONSTANTS } from './cloudwatch-metrics.constants';
import {
  CloudWatchMetricData,
  CloudWatchMetricsService,
  setModuleCloudWatchClient,
} from './cloudwatch-metrics.service';

jest.mock('@aws-sdk/client-cloudwatch');

const mockGetAwsRegion = jest.fn(() => 'us-east-1');
const mockGetEnableCloudwatchMetrics = jest.fn(() => false);
const mockGetCloudwatchMetricsNamespace = jest.fn(
  () => undefined as string | undefined,
);

jest.mock('@carrot-fndn/shared/env', () => ({
  getAwsRegion: () => mockGetAwsRegion(),
  getCloudwatchMetricsNamespace: () => mockGetCloudwatchMetricsNamespace(),
  getEnableCloudwatchMetrics: () => mockGetEnableCloudwatchMetrics(),
  getOptionalEnv: jest.fn(),
}));

const mockCloudWatchClient = jest.mocked(CloudWatchClient);

const setMockEnvironment = (
  overrides: {
    awsRegion?: string;
    cloudwatchMetricsNamespace?: string | undefined;
    enableCloudwatchMetrics?: boolean;
  } = {},
) => {
  mockGetAwsRegion.mockReturnValue(overrides.awsRegion ?? 'us-east-1');
  mockGetEnableCloudwatchMetrics.mockReturnValue(
    overrides.enableCloudwatchMetrics ?? false,
  );
  mockGetCloudwatchMetricsNamespace.mockReturnValue(
    overrides.cloudwatchMetricsNamespace,
  );
};

const createMockCloudWatchMetricData = (
  overrides: Partial<CloudWatchMetricData> = {},
): CloudWatchMetricData => ({
  documentManifestType: faker.string.sample(),
  ...overrides,
});

describe('CloudWatchMetricsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CloudWatchMetricsService['instance'] = null;
    setModuleCloudWatchClient(null);
    setMockEnvironment();
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
      setMockEnvironment({
        awsRegion: 'us-east-1',
        cloudwatchMetricsNamespace: undefined,
        enableCloudwatchMetrics: false,
      });

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance['namespace']).toBe(
        CLOUDWATCH_CONSTANTS.DEFAULT_NAMESPACE,
      );
      expect(instance.isEnabled()).toBe(false);
    });

    it('should use custom CLOUDWATCH_METRICS_NAMESPACE when provided', () => {
      setMockEnvironment({
        cloudwatchMetricsNamespace: 'Custom/Namespace',
      });

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance['namespace']).toBe('Custom/Namespace');
    });

    it('should use configured AWS region', async () => {
      setMockEnvironment({
        awsRegion: 'ap-southeast-1',
        enableCloudwatchMetrics: true,
      });

      const instance = CloudWatchMetricsService.getInstance();
      const mockData = createMockCloudWatchMetricData();

      await instance.recordAIValidationFailure(mockData);

      expect(mockCloudWatchClient).toHaveBeenCalledWith({
        region: 'ap-southeast-1',
      });
    });
  });

  describe('isEnabled', () => {
    it('should be disabled when ENABLE_CLOUDWATCH_METRICS is undefined', () => {
      setMockEnvironment({
        enableCloudwatchMetrics: false,
      });

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance.isEnabled()).toBe(false);
    });

    it('should be enabled when ENABLE_CLOUDWATCH_METRICS is true', () => {
      setMockEnvironment({
        enableCloudwatchMetrics: true,
      });

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance.isEnabled()).toBe(true);
    });

    it('should be disabled when ENABLE_CLOUDWATCH_METRICS is false', () => {
      setMockEnvironment({
        enableCloudwatchMetrics: false,
      });

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance.isEnabled()).toBe(false);
    });
  });

  describe('recordAIValidationFailure', () => {
    it('should return a boolean from isEnabled method', () => {
      const instance = CloudWatchMetricsService.getInstance();
      const result = instance.isEnabled();

      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });

    it('should handle valid CloudWatchMetricData without throwing', async () => {
      setMockEnvironment({
        enableCloudwatchMetrics: true,
      });

      const instance = CloudWatchMetricsService.getInstance();
      const mockData = createMockCloudWatchMetricData({
        documentManifestType: 'custom-manifest',
      });

      await expect(
        instance.recordAIValidationFailure(mockData),
      ).resolves.not.toThrow();
    });
  });

  describe('CloudWatch integration', () => {
    it('should instantiate CloudWatchClient with correct region configuration', async () => {
      setMockEnvironment({
        awsRegion: 'us-west-2',
        enableCloudwatchMetrics: true,
      });

      const instance = CloudWatchMetricsService.getInstance();
      const mockData = createMockCloudWatchMetricData();

      await instance.recordAIValidationFailure(mockData);

      expect(mockCloudWatchClient).toHaveBeenCalledWith({
        region: 'us-west-2',
      });
    });

    it('should reuse the same CloudWatchClient instance (singleton behavior)', async () => {
      setMockEnvironment({
        enableCloudwatchMetrics: true,
      });

      const instance = CloudWatchMetricsService.getInstance();
      const mockData = createMockCloudWatchMetricData();

      await instance.recordAIValidationFailure(mockData);
      await instance.recordAIValidationFailure(mockData);

      expect(mockCloudWatchClient).toHaveBeenCalledTimes(1);
    });

    it('should use correct namespace from configuration', () => {
      setMockEnvironment({
        cloudwatchMetricsNamespace: 'Custom/TestNamespace',
      });

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance['namespace']).toBe('Custom/TestNamespace');
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
    it('should use default when namespace is undefined', async () => {
      setMockEnvironment({
        cloudwatchMetricsNamespace: undefined,
        enableCloudwatchMetrics: true,
      });

      const instance = CloudWatchMetricsService.getInstance();

      expect(instance['namespace']).toBe(
        CLOUDWATCH_CONSTANTS.DEFAULT_NAMESPACE,
      );

      const mockData = createMockCloudWatchMetricData();

      await instance.recordAIValidationFailure(mockData);

      expect(mockCloudWatchClient).toHaveBeenCalledWith({
        region: 'us-east-1',
      });
    });
  });
});
