import type { AnyObject } from '@carrot-fndn/shared/types';

import {
  provideSmaugApiCredentials,
  signRequest as signAwsHttpRequest,
  type SignRequestInput,
} from '@carrot-fndn/shared/aws-http';
import {
  getArtifactChecksum,
  getAwsRegion,
  getSourceCodeUrl,
  getSourceCodeVersion,
} from '@carrot-fndn/shared/env';
import { logger } from '@carrot-fndn/shared/helpers';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputSchema,
  type RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import {
  type PostProcessInput,
  PostProcessInputSchema,
} from './rule-result.schemas';

export const mapRuleOutputToPostProcessInput = (
  ruleOutput: RuleOutput,
): PostProcessInput =>
  PostProcessInputSchema.parse({
    output: {
      artifactChecksum: getArtifactChecksum(),
      comment: ruleOutput.resultComment,
      content: ruleOutput.resultContent,
      sourceCodeUrl: getSourceCodeUrl(),
      sourceCodeVersion: getSourceCodeVersion(),
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

export const signRequest = async (input: SignRequestInput) =>
  signAwsHttpRequest(input, getAwsRegion(), provideSmaugApiCredentials());

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
