import { ZodError } from 'zod';

import {
  getArtifactChecksum,
  getAuditUrl,
  getAwsRegion,
  getBooleanEnv,
  getCloudwatchMetricsNamespace,
  getDocumentAttachmentBucketName,
  getDocumentBucketName,
  getEnableCloudwatchMetrics,
  getEnvironment,
  getNodeEnv,
  getOptionalEnv,
  getRequiredEnv,
  getSentryDsn,
  getSmaugApiGatewayAssumeRoleArn,
  getSourceCodeUrl,
  getSourceCodeVersion,
} from './env.helpers';

describe('getRequiredEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return the value when present', () => {
    process.env['TEST_VAR'] = 'test-value';

    expect(getRequiredEnv('TEST_VAR')).toBe('test-value');
  });

  it('should throw ZodError when variable is missing', () => {
    delete process.env['TEST_VAR'];

    expect(() => getRequiredEnv('TEST_VAR')).toThrow(ZodError);
  });

  it('should throw ZodError when variable is empty', () => {
    process.env['TEST_VAR'] = '';

    expect(() => getRequiredEnv('TEST_VAR')).toThrow(ZodError);
  });
});

describe('getOptionalEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return the value when present', () => {
    process.env['TEST_VAR'] = 'test-value';

    expect(getOptionalEnv('TEST_VAR')).toBe('test-value');
  });

  it('should return undefined when missing and no default', () => {
    delete process.env['TEST_VAR'];

    expect(getOptionalEnv('TEST_VAR')).toBeUndefined();
  });

  it('should return default value when missing', () => {
    delete process.env['TEST_VAR'];

    expect(getOptionalEnv('TEST_VAR', 'default')).toBe('default');
  });
});

describe('getBooleanEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return true for "true"', () => {
    process.env['TEST_VAR'] = 'true';

    expect(getBooleanEnv('TEST_VAR')).toBe(true);
  });

  it('should return false for "false"', () => {
    process.env['TEST_VAR'] = 'false';

    expect(getBooleanEnv('TEST_VAR')).toBe(false);
  });

  it('should handle case-insensitive values', () => {
    process.env['TEST_VAR'] = 'TRUE';

    expect(getBooleanEnv('TEST_VAR')).toBe(true);
  });

  it('should return default value when missing', () => {
    delete process.env['TEST_VAR'];

    expect(getBooleanEnv('TEST_VAR')).toBe(false);
    expect(getBooleanEnv('TEST_VAR', true)).toBe(true);
  });
});

describe('specific env helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('required env helpers', () => {
    it.each([
      { fn: getArtifactChecksum, key: 'ARTIFACT_CHECKSUM' },
      { fn: getAuditUrl, key: 'AUDIT_URL' },
      { fn: getAwsRegion, key: 'AWS_REGION' },
      { fn: getDocumentBucketName, key: 'DOCUMENT_BUCKET_NAME' },
      { fn: getEnvironment, key: 'ENVIRONMENT' },
      { fn: getNodeEnv, key: 'NODE_ENV' },
      {
        fn: getSmaugApiGatewayAssumeRoleArn,
        key: 'SMAUG_API_GATEWAY_ASSUME_ROLE_ARN',
      },
      { fn: getSourceCodeUrl, key: 'SOURCE_CODE_URL' },
      { fn: getSourceCodeVersion, key: 'SOURCE_CODE_VERSION' },
    ])('$key should return value when set', ({ fn, key }) => {
      process.env[key] = 'test-value';

      expect(fn()).toBe('test-value');
    });

    it.each([
      { fn: getArtifactChecksum, key: 'ARTIFACT_CHECKSUM' },
      { fn: getAuditUrl, key: 'AUDIT_URL' },
      { fn: getAwsRegion, key: 'AWS_REGION' },
      { fn: getDocumentBucketName, key: 'DOCUMENT_BUCKET_NAME' },
      { fn: getEnvironment, key: 'ENVIRONMENT' },
      { fn: getNodeEnv, key: 'NODE_ENV' },
      {
        fn: getSmaugApiGatewayAssumeRoleArn,
        key: 'SMAUG_API_GATEWAY_ASSUME_ROLE_ARN',
      },
      { fn: getSourceCodeUrl, key: 'SOURCE_CODE_URL' },
      { fn: getSourceCodeVersion, key: 'SOURCE_CODE_VERSION' },
    ])('$key should throw when not set', ({ fn, key }) => {
      delete process.env[key];

      expect(() => fn()).toThrow(ZodError);
    });
  });

  describe('optional env helpers', () => {
    it('getCloudwatchMetricsNamespace should return value when set', () => {
      process.env['CLOUDWATCH_METRICS_NAMESPACE'] = 'Custom/Namespace';

      expect(getCloudwatchMetricsNamespace()).toBe('Custom/Namespace');
    });

    it('getCloudwatchMetricsNamespace should return undefined when not set', () => {
      delete process.env['CLOUDWATCH_METRICS_NAMESPACE'];

      expect(getCloudwatchMetricsNamespace()).toBeUndefined();
    });

    it('getDocumentAttachmentBucketName should return value when set', () => {
      process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'] = 'my-bucket';

      expect(getDocumentAttachmentBucketName()).toBe('my-bucket');
    });

    it('getDocumentAttachmentBucketName should return undefined when not set', () => {
      delete process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];

      expect(getDocumentAttachmentBucketName()).toBeUndefined();
    });

    it('getSentryDsn should return value when set', () => {
      process.env['SENTRY_DSN'] = 'https://sentry.example.com';

      expect(getSentryDsn()).toBe('https://sentry.example.com');
    });

    it('getSentryDsn should return undefined when not set', () => {
      delete process.env['SENTRY_DSN'];

      expect(getSentryDsn()).toBeUndefined();
    });
  });

  describe('boolean env helpers', () => {
    it('getEnableCloudwatchMetrics should return true when set to "true"', () => {
      process.env['ENABLE_CLOUDWATCH_METRICS'] = 'true';

      expect(getEnableCloudwatchMetrics()).toBe(true);
    });

    it('getEnableCloudwatchMetrics should return false when not set', () => {
      delete process.env['ENABLE_CLOUDWATCH_METRICS'];

      expect(getEnableCloudwatchMetrics()).toBe(false);
    });
  });
});
