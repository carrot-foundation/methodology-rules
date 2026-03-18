import type { AnyObject } from '@carrot-fndn/shared/types';

import { Sha256 } from '@aws-crypto/sha256-js';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { fromEnv } from '@aws-sdk/credential-providers';
import { assertString, logger } from '@carrot-fndn/shared/helpers';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputSchema,
  type RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { SignatureV4 } from '@smithy/signature-v4';

import {
  type Credentials,
  CredentialsSchema,
  type PostProcessInput,
  PostProcessInputSchema,
} from './rule-result.schemas';

export const nilSafeRun = <T, R>(
  value: null | T | undefined,
  callback: (parameter: T) => R,
): R | undefined =>
  value !== null && value !== undefined ? callback(value) : undefined;

export const mapRuleOutputToPostProcessInput = (
  ruleOutput: RuleOutput,
): PostProcessInput =>
  PostProcessInputSchema.parse({
    output: {
      artifactChecksum: process.env['ARTIFACT_CHECKSUM'],
      comment: ruleOutput.resultComment,
      content: ruleOutput.resultContent,
      sourceCodeUrl: process.env['SOURCE_CODE_URL'],
      sourceCodeVersion: process.env['SOURCE_CODE_VERSION'],
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
    resultComment?: string | undefined;
    resultContent?: AnyObject | undefined;
  } = {},
): RuleOutput =>
  RuleOutputSchema.parse({
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

  return CredentialsSchema.parse(assumeRoleResponse.Credentials);
};

export const signRequest = async ({
  body,
  method,
  query,
  url,
}: {
  body?: unknown;
  method: string;
  query?: Record<string, null | string | string[]>;
  url: URL;
}) => {
  const smaugApiGatewayAssumeRoleArn = assertString(
    process.env['SMAUG_API_GATEWAY_ASSUME_ROLE_ARN'],
  );
  const smaugAwsRegion = assertString(process.env['AWS_REGION']);

  const credentials = await assumeRoleSmaugCredentials({
    assumeRoleArn: smaugApiGatewayAssumeRoleArn,
    awsRegion: smaugAwsRegion,
  });

  const signer = new SignatureV4({
    credentials: {
      accessKeyId: credentials.AccessKeyId,
      secretAccessKey: credentials.SecretAccessKey,
      sessionToken: credentials.SessionToken,
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
  RuleOutputSchema.parse(ruleOutput);

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
    logger.error(error, 'Failed to report rule results');

    throw error;
  }
};
