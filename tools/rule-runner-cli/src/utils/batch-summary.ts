import { bold } from '@carrot-fndn/shared/cli';
import { logger } from '@carrot-fndn/shared/helpers';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const LOGS_DIR = path.resolve(__dirname, '../../logs');

export interface ReasonCodeBreakdown {
  code: string;
  count: number;
}

export interface RuleResultEntry {
  resultComment?: string | undefined;
  resultContent?: Record<string, unknown> | undefined;
  resultStatus: string;
}

export const buildReasonCodeBreakdown = (
  results: RuleResultEntry[],
  field: 'failReasons' | 'reviewReasons',
): ReasonCodeBreakdown[] => {
  const codeCounts = new Map<string, number>();

  for (const result of results) {
    const reasons = result.resultContent?.[field];

    if (!Array.isArray(reasons)) {
      continue;
    }

    for (const reason of reasons as unknown[]) {
      if (
        typeof reason === 'object' &&
        reason !== null &&
        'code' in reason &&
        typeof (reason as { code: unknown }).code === 'string'
      ) {
        const code = (reason as { code: string }).code;

        codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
      }
    }
  }

  return [...codeCounts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
};

export const appendBreakdown = (
  lines: string[],
  title: string,
  breakdown: ReasonCodeBreakdown[],
  color: (text: string) => string,
): void => {
  if (breakdown.length === 0) {
    return;
  }

  lines.push('', bold(title));

  for (const { code, count } of breakdown) {
    lines.push(color(`  ${code}: ${String(count)}`));
  }
};

export const writeJsonLog = async (
  data: unknown[],
  prefix: string,
  customPath?: string,
): Promise<void> => {
  const timestamp = new Date().toISOString().replaceAll(':', '-');

  await mkdir(LOGS_DIR, { recursive: true });

  const filePath =
    customPath ?? path.join(LOGS_DIR, `${prefix}-${timestamp}.json`);

  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

  logger.info(`${prefix} JSON written to: ${filePath}`);
};
