import type { BumpLevel } from './types';
import { RELEASE_RULES } from './types';

const BUMP_PRECEDENCE: Record<BumpLevel, number> = {
  major: 3,
  minor: 2,
  patch: 1,
};

export const HEADER_PATTERN = /^(\w*)(?:\(([\w$.* -]*)\))?(!?): (.*)$/;

interface ParsedCommit {
  isBreaking: boolean;
  scope: string | undefined;
  subject: string;
  type: string;
}

function parseCommitMessage(message: string): ParsedCommit | undefined {
  const header = message.split('\n')[0];
  const match = HEADER_PATTERN.exec(header);
  if (!match) return undefined;

  const [, type, scope, bang, subject] = match;
  if (!type) return undefined;

  return {
    // Only the '!' notation (e.g. feat(scope)!:) is supported for breaking changes,
    // since commits are parsed from subject lines only.
    isBreaking: bang === '!',
    scope: scope ?? undefined,
    subject: subject ?? '',
    type,
  };
}

export function parseCommitsForRules(
  commitMessages: string[],
): Map<string, BumpLevel> {
  const ruleBumps = new Map<string, BumpLevel>();

  for (const message of commitMessages) {
    const parsed = parseCommitMessage(message);
    if (!parsed?.type || !parsed.scope) continue;

    const bumpLevel: BumpLevel | null = parsed.isBreaking
      ? 'major'
      : (RELEASE_RULES[parsed.type] ?? null);

    if (!bumpLevel) continue;

    const currentBump = ruleBumps.get(parsed.scope);
    if (
      !currentBump ||
      BUMP_PRECEDENCE[bumpLevel] > BUMP_PRECEDENCE[currentBump]
    ) {
      ruleBumps.set(parsed.scope, bumpLevel);
    }
  }

  return ruleBumps;
}
