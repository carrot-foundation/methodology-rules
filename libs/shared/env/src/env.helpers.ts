import { z } from 'zod';

export const getRequiredEnv = (key: string): string =>
  z
    .string()
    .min(1, `Environment variable ${key} is required`)
    // eslint-disable-next-line security/detect-object-injection
    .parse(process.env[key]);

export const getOptionalEnv = (
  key: string,
  defaultValue?: string,
  // eslint-disable-next-line security/detect-object-injection
): string | undefined => process.env[key] ?? defaultValue;

export const getBooleanEnv = (key: string, defaultValue = false): boolean => {
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  return value.trim().toLowerCase() === 'true';
};

// Required env vars
export const getArtifactChecksum = (): string =>
  getRequiredEnv('ARTIFACT_CHECKSUM');
export const getAuditUrl = (): string => getRequiredEnv('AUDIT_URL');
export const getAwsRegion = (): string => getRequiredEnv('AWS_REGION');
export const getDocumentBucketName = (): string =>
  getRequiredEnv('DOCUMENT_BUCKET_NAME');
export const getEnvironment = (): string => getRequiredEnv('ENVIRONMENT');
export const getNodeEnv = (): string => getRequiredEnv('NODE_ENV');
export const getSmaugApiGatewayAssumeRoleArn = (): string =>
  getRequiredEnv('SMAUG_API_GATEWAY_ASSUME_ROLE_ARN');
export const getSourceCodeUrl = (): string => getRequiredEnv('SOURCE_CODE_URL');
export const getSourceCodeVersion = (): string =>
  getRequiredEnv('SOURCE_CODE_VERSION');

// Optional env vars
export const getCloudwatchMetricsNamespace = (): string | undefined =>
  getOptionalEnv('CLOUDWATCH_METRICS_NAMESPACE');
export const getDocumentAttachmentBucketName = (): string | undefined =>
  getOptionalEnv('DOCUMENT_ATTACHMENT_BUCKET_NAME');
export const getEnableCloudwatchMetrics = (): boolean =>
  getBooleanEnv('ENABLE_CLOUDWATCH_METRICS');
export const getSentryDsn = (): string | undefined =>
  getOptionalEnv('SENTRY_DSN');
