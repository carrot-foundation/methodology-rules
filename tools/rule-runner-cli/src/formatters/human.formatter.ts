import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { blue, bold, gray, green, red, yellow } from '@carrot-fndn/shared/cli';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

interface HumanFormatOptions {
  debug?: boolean;
  elapsedMs?: number;
}

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
