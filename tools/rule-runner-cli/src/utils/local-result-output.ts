import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { formatAsJson } from '@carrot-fndn/shared/cli';

import { formatAsHuman } from '../formatters/human.formatter';

export const createLocalRuleExecutionError = (): Error =>
  new Error('LOCAL_RULE_EXECUTION_FAILED');

export const writeLocalRuleOutput = (
  output: RuleOutput,
  options: { debug: boolean; elapsedMs: number; json: boolean },
): void => {
  const formattedOutput = options.json
    ? formatAsJson(output)
    : formatAsHuman(output, {
        debug: options.debug,
        elapsedMs: options.elapsedMs,
      });

  process.stdout.write(`${formattedOutput}\n`);
};

export const toDryRunRuleResultLog = (
  documentId: string,
  ruleResult: {
    resultComment?: string | undefined;
    resultContent?: Record<string, unknown> | undefined;
    ruleSlug: string;
    status: string;
  },
  mode: 'local' | 'registered',
): {
  documentId: string;
  resultComment?: string | undefined;
  resultContent?: Record<string, unknown> | undefined;
  resultStatus: string;
  ruleSlug: string;
} =>
  mode === 'local'
    ? {
        documentId,
        resultStatus: ruleResult.status,
        ruleSlug: ruleResult.ruleSlug,
      }
    : {
        documentId,
        resultComment: ruleResult.resultComment,
        resultContent: ruleResult.resultContent,
        resultStatus: ruleResult.status,
        ruleSlug: ruleResult.ruleSlug,
      };
