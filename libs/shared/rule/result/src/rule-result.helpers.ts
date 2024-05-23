import type {
  RuleInput,
  RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import type { AnyObject } from '@carrot-fndn/shared/types';

import { Sha256 } from '@aws-crypto/sha256-js';
import {
  AssumeRoleCommand,
  type Credentials,
  STSClient,
} from '@aws-sdk/client-sts';
import { fromEnv } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { assert } from 'typia';

import type { PostProcessInput } from './rule-result.types';

export const nilSafeRun = <T, R>(
  value: T | null | undefined,
  callback: (value: T) => R,
): R | undefined =>
  value !== null && value !== undefined ? callback(value) : undefined;

export const mapRuleOutputToPostProcessInput = (
  ruleOutput: RuleOutput,
): PostProcessInput => ({
  output: {
    artifactChecksum: assert<string>(process.env['ARTIFACT_CHECKSUM']),
    ...(ruleOutput.resultComment && { comment: ruleOutput.resultComment }),
    ...(ruleOutput.resultContent && { content: ruleOutput.resultContent }),
    sourceCodeUrl: assert<string>(process.env['SOURCE_CODE_URL']),
    sourceCodeVersion: assert<string>(process.env['SOURCE_CODE_VERSION']),
    status: ruleOutput.resultStatus,
  },
  taskToken: ruleOutput.responseToken,
});

export const mapToRuleOutput = (
  ruleInput: RuleInput,
  resultStatus: RuleOutputStatus,
  {
    resultComment,
    resultContent,
  }: {
    resultComment?: string;
    resultContent?: AnyObject;
  } = {},
): RuleOutput => ({
  requestId: ruleInput.requestId,
  responseToken: ruleInput.responseToken,
  responseUrl: ruleInput.responseUrl,
  resultComment,
  resultContent,
  resultStatus,
});

export const assumeRoleSmaugCredentials = async ({
  assumeRoleArn,
  awsRegion,
}: {
  assumeRoleArn: string;
  awsRegion: string;
}): Promise<Credentials> => {
  const assumeRoleCommand = new AssumeRoleCommand({
    RoleArn: assumeRoleArn,
    RoleSessionName: 'smaug-document-sync',
  });

  const stsClient = new STSClient({
    credentials: fromEnv(),
    region: awsRegion,
  });

  const assumeRoleResponse = await stsClient.send(assumeRoleCommand);

  return assert<Credentials>(assumeRoleResponse.Credentials);
};

export const signRequest = async ({
  body,
  method,
  query,
  url,
}: {
  body?: unknown;
  method: string;
  query?: Record<string, Array<string> | null | string>;
  url: URL;
}) => {
  const smaugApiGatewayAssumeRoleArn = assert<string>(
    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'],
  );
  const smaugAwsRegion = assert<string>(process.env['AWS_REGION']);

  const credentials = await assumeRoleSmaugCredentials({
    assumeRoleArn: smaugApiGatewayAssumeRoleArn,
    awsRegion: smaugAwsRegion,
  });

  const signer = new SignatureV4({
    credentials: {
      accessKeyId: assert<string>(credentials.AccessKeyId),
      secretAccessKey: assert<string>(credentials.SecretAccessKey),
      sessionToken: assert<string>(credentials.SessionToken),
    },
    region: smaugAwsRegion,
    service: 'execute-api',
    sha256: Sha256,
  });

  return signer.sign({
    body: nilSafeRun(body, (value) => JSON.stringify(value)),
    headers: {
      'Content-Type': 'application/json',
      Host: url.host,
    },
    hostname: url.hostname,
    method,
    path: url.pathname,
    protocol: 'https',
    ...nilSafeRun(query, (value) => ({ query: value })),
  });
};

export const reportRuleResults = async (
  ruleOutput: RuleOutput,
): Promise<void> => {
  assert<RuleOutput>(ruleOutput);

  try {
    const url = new URL(ruleOutput.responseUrl);

    const request = await signRequest({
      body: mapRuleOutputToPostProcessInput(ruleOutput),
      method: 'POST',
      url,
    });

    const response = await fetch(ruleOutput.responseUrl, request);

    if (!response.ok) {
      throw new Error(
        `Failed to report rule results: status ${
          response.status
        }. Response body: ${await response.text()}`,
      );
    }
  } catch (error) {
    // TODO: use logger API
    console.error('Failed to report rule results', error);

    throw error;
  }
};
