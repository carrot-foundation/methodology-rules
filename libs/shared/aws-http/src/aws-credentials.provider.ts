import {
  fromEnv,
  fromTemporaryCredentials,
} from '@aws-sdk/credential-providers';
import { getSmaugApiGatewayAssumeRoleArn } from '@carrot-fndn/shared/env';

export type AwsCredentialIdentityProvider = ReturnType<typeof fromEnv>;

const SMAUG_API_ROLE_ARN_PATTERN =
  /^arn:aws:iam::\d{12}:role\/[A-Za-z0-9+=,.@_/-]+$/;

const PROVIDERS_BY_ROLE_ARN = new Map<string, AwsCredentialIdentityProvider>();
const REFRESH_WINDOW_MILLISECONDS = 5 * 60_000;

const requireValidSmaugApiRoleArn = (): string => {
  const roleArn = getSmaugApiGatewayAssumeRoleArn();

  if (!SMAUG_API_ROLE_ARN_PATTERN.test(roleArn)) {
    throw new TypeError(
      'SMAUG_API_GATEWAY_ASSUME_ROLE_ARN must be a valid AWS IAM role ARN',
    );
  }

  return roleArn;
};

const memoizeCredentials = (
  source: AwsCredentialIdentityProvider,
): AwsCredentialIdentityProvider => {
  let cached: Awaited<ReturnType<AwsCredentialIdentityProvider>> | undefined;
  let inFlight: ReturnType<AwsCredentialIdentityProvider> | undefined;

  return async () => {
    const refreshAfter = Date.now() + REFRESH_WINDOW_MILLISECONDS;

    if (
      cached !== undefined &&
      (cached.expiration === undefined ||
        cached.expiration.getTime() > refreshAfter)
    ) {
      return cached;
    }

    inFlight ??= (async () => {
      const credentials = await source();

      cached = credentials;

      return credentials;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = undefined;
    }
  };
};

const resolveSmaugApiCredentials: AwsCredentialIdentityProvider = async () => {
  const roleArn = requireValidSmaugApiRoleArn();
  const source =
    PROVIDERS_BY_ROLE_ARN.get(roleArn) ??
    memoizeCredentials(
      fromTemporaryCredentials({
        clientConfig: {},
        masterCredentials: fromEnv(),
        params: {
          RoleArn: roleArn,
          RoleSessionName: 'methodology-rules-smaug-api',
        },
      }),
    );

  PROVIDERS_BY_ROLE_ARN.set(roleArn, source);

  return source();
};

export const provideSmaugApiCredentials = (): AwsCredentialIdentityProvider =>
  resolveSmaugApiCredentials;
