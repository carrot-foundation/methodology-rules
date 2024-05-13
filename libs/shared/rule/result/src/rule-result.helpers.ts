import type {
  RuleInput,
  RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import type { AnyObject } from '@carrot-fndn/shared/types';

import { Sha256 } from '@aws-crypto/sha256-js';
import { fromEnv } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { assert } from 'typia';

import type { PostProcessInput } from './rule-result.types';

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

export const signRequest = async ({
  ruleOutput,
}: {
  ruleOutput: RuleOutput;
}): Promise<RequestInit> => {
  const signer = new SignatureV4({
    credentials: fromEnv(),
    region: 'us-east-1',
    service: 'api-gateway',
    sha256: Sha256,
  });

  return signer.sign({
    body: JSON.stringify(mapRuleOutputToPostProcessInput(ruleOutput)),
    headers: {
      'Content-Type': 'application/json',
    },
    hostname: '',
    method: 'POST',
    path: '',
    protocol: 'https',
  });
};

export const reportRuleResults = async (
  ruleOutput: RuleOutput,
): Promise<void> => {
  assert<RuleOutput>(ruleOutput);

  try {
    const request = await signRequest({ ruleOutput });
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
