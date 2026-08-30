import {
  fromEnv,
  fromTemporaryCredentials,
} from '@aws-sdk/credential-providers';
import { getSmaugApiGatewayAssumeRoleArn } from '@carrot-fndn/shared/env';

export type AwsCredentialIdentityProvider = ReturnType<typeof fromEnv>;

const smaugApiRoleArnPattern =
  /^arn:aws:iam::\d{12}:role\/[A-Za-z0-9+=,.@_/-]+$/;

const providersByRoleArn = new Map<string, AwsCredentialIdentityProvider>();

const requireValidSmaugApiRoleArn = (): string => {
  const roleArn = getSmaugApiGatewayAssumeRoleArn();

  if (!smaugApiRoleArnPattern.test(roleArn)) {
    throw new TypeError(
      'SMAUG_API_GATEWAY_ASSUME_ROLE_ARN must be a valid AWS IAM role ARN',
    );
  }

  return roleArn;
};

export const provideSmaugApiCredentials = (): AwsCredentialIdentityProvider => {
  const roleArn = requireValidSmaugApiRoleArn();
  const cachedProvider = providersByRoleArn.get(roleArn);

  if (cachedProvider) {
    return cachedProvider;
  }

  const provider = fromTemporaryCredentials({
    clientConfig: {},
    masterCredentials: fromEnv(),
    params: {
      RoleArn: roleArn,
      RoleSessionName: 'methodology-rules-smaug-api',
    },
  });

  providersByRoleArn.set(roleArn, provider);

  return provider;
};
