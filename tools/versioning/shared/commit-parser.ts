import { CommitParser } from 'conventional-commits-parser';

import type { BumpLevel } from './types';
import { RELEASE_RULES } from './types';

const BUMP_PRECEDENCE: Record<BumpLevel, number> = {
  major: 3,
  minor: 2,
  patch: 1,
};

const commitParser = new CommitParser({
  headerCorrespondence: ['type', 'scope', 'subject'],
  headerPattern: /^(\w*)(?:\(([\w$.* -]*)\))?!?: (.*)$/,
});

export function parseCommitsForRules(
  commitMessages: string[],
): Map<string, BumpLevel> {
  const ruleBumps = new Map<string, BumpLevel>();

  for (const message of commitMessages) {
    const parsed = commitParser.parse(message);
    if (!parsed.type || !parsed.scope) continue;

    const isBreaking =
      message.includes('!:') ||
      (parsed.notes ?? []).some((n) => n.title === 'BREAKING CHANGE');

    const bumpLevel: BumpLevel | null = isBreaking
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
