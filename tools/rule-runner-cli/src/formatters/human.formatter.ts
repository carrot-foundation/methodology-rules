import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

interface HumanFormatOptions {
  debug?: boolean;
  elapsedMs?: number;
}

const bold = (text: string) => `\u001B[1m${text}\u001B[22m`;
const gray = (text: string) => `\u001B[90m${text}\u001B[39m`;
const green = (text: string) => `\u001B[92m${text}\u001B[39m`;
const red = (text: string) => `\u001B[91m${text}\u001B[39m`;
const blue = (text: string) => `\u001B[94m${text}\u001B[39m`;
const yellow = (text: string) => `\u001B[93m${text}\u001B[39m`;

export const formatAsHuman = (
  result: RuleOutput,
  options: HumanFormatOptions = {},
): string => {
  const passed = result.resultStatus === RuleOutputStatus.PASSED;
  const statusColor = passed ? green : red;
  const statusIcon = passed ? '✓' : '✗';

  const statusText = statusColor(bold(`${statusIcon} ${result.resultStatus}`));

  const lines: string[] = [
    `\n${bold(blue('=== Rule Execution Result ==='))}\n`,
    `${bold('Status:')} ${statusText}`,
  ];

  if (result.resultComment) {
    lines.push(`${bold('Comment:')} ${result.resultComment}`);
  }

  if (result.resultContent) {
    lines.push(
      `\n${bold('Result Content:')}`,
      yellow(JSON.stringify(result.resultContent, undefined, 2)),
    );
  }

  if (options.elapsedMs !== undefined) {
    const elapsed = gray(`Elapsed: ${options.elapsedMs}ms`);

    lines.push(`\n${elapsed}`);
  }

  if (options.debug === true) {
    lines.push(
      `\n${bold(blue('=== Full Output ==='))}\n`,
      gray(JSON.stringify(result, undefined, 2)),
    );
  }

  lines.push('');

  return lines.join('\n');
};
