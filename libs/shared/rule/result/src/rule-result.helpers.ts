import type { AnyObject } from '@carrot-fndn/shared/types';
import type { Context } from 'aws-lambda';

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
import {
  formatHttpStatus,
  isNonEmptyArray,
  logger,
} from '@carrot-fndn/shared/helpers';
import {
  type RuleFinding,
  type RuleInput,
  type RuleOutput,
  RuleOutputSchema,
  type RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { randomInt } from 'node:crypto';

import {
  type PostProcessInput,
  PostProcessInputSchema,
} from './rule-result.schemas';

const RETRYABLE_REPORT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_REPORT_ATTEMPTS = 4;
const BASE_REPORT_RETRY_DELAY_MS = 1000;
const REPORT_TIME_MARGIN_MS = 5000;

interface ReportFailure {
  error: unknown;
  retryable: boolean;
  status?: number;
}

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
      ...(ruleOutput.timing === undefined ? {} : { timing: ruleOutput.timing }),
    },
    taskToken: ruleOutput.responseToken,
  });

export const mapToRuleOutput = (
  ruleInput: RuleInput,
  resultStatus: RuleOutputStatus,
  {
    resultComment,
    resultContent,
    resultFindings,
  }: {
    resultComment?: string | undefined;
    resultContent?: AnyObject | undefined;
    resultFindings?: RuleFinding[] | undefined;
  } = {},
): RuleOutput => {
  const isNonPassing = resultStatus !== 'PASSED';
  const hasFindings = isNonEmptyArray(resultFindings);

  if (isNonPassing && !hasFindings) {
    logger.error(
      {
        requestId: ruleInput.requestId,
        resultStatus,
        ruleName: ruleInput.ruleName,
      },
      'Non-passing rule result has no findings',
    );
  }

  return RuleOutputSchema.parse({
    requestId: ruleInput.requestId,
    responseToken: ruleInput.responseToken,
    responseUrl: ruleInput.responseUrl,
    resultComment,
    resultContent:
      isNonPassing && hasFindings
        ? { ...resultContent, findings: resultFindings }
        : resultContent,
    resultStatus,
  });
};

export const signRequest = async (
  input: SignRequestInput,
): ReturnType<typeof signAwsHttpRequest> =>
  signAwsHttpRequest(input, getAwsRegion(), provideSmaugApiCredentials());

const sendRuleResults = async (
  ruleOutput: RuleOutput,
): Promise<ReportFailure | undefined> => {
  const request = await signRequest({
    body: mapRuleOutputToPostProcessInput(ruleOutput),
    method: 'POST',
    url: new URL(ruleOutput.responseUrl),
  });

  try {
    const response = await fetch(ruleOutput.responseUrl, request);

    if (response.ok) {
      return undefined;
    }

    return {
      error: new Error(
        `Failed to report rule results: status ${formatHttpStatus(response.status)}`,
      ),
      retryable: RETRYABLE_REPORT_STATUSES.has(response.status),
      status: response.status,
    };
  } catch (error) {
    // fetch rejects with a TypeError on a network error
    return { error, retryable: error instanceof TypeError };
  }
};

export const reportRuleResults = async (
  ruleOutput: RuleOutput,
  context: Pick<Context, 'getRemainingTimeInMillis'>,
): Promise<void> => {
  RuleOutputSchema.parse(ruleOutput);

  try {
    for (let attempt = 1; ; attempt += 1) {
      const failure = await sendRuleResults(ruleOutput);

      if (failure === undefined) {
        return;
      }

      const delayMs = randomInt(
        BASE_REPORT_RETRY_DELAY_MS * 2 ** (attempt - 1),
      );

      if (
        !failure.retryable ||
        attempt >= MAX_REPORT_ATTEMPTS ||
        context.getRemainingTimeInMillis() - delayMs < REPORT_TIME_MARGIN_MS
      ) {
        throw failure.error;
      }

      logger.warn(
        { attempt, delayMs, error: failure.error, status: failure.status },
        'Retrying rule results report',
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  } catch (error) {
    logger.error(error, 'Failed to report rule results');

    throw error;
  }
};
