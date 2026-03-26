export type BumpLevel = 'major' | 'minor' | 'patch';

export interface RuleBump {
  bumpLevel: BumpLevel;
  commits: string[];
  newVersion: string;
  previousVersion: string;
  slug: string;
}

export interface ApplicationBump {
  addedRules: string[];
  bumpLevel: BumpLevel;
  methodology: string;
  newVersion: string;
  previousVersion: string;
  removedRules: string[];
  ruleBumps: RuleBump[];
}

export const RELEASE_RULES: Record<string, BumpLevel | null> = {
  build: null,
  chore: null,
  ci: null,
  docs: null,
  feat: 'minor',
  fix: 'patch',
  perf: 'patch',
  refactor: 'patch',
  revert: 'patch',
  style: null,
  test: null,
};
