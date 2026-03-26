import { z } from 'zod';

export type BumpLevel = 'major' | 'minor' | 'patch';

export const RuleBumpSchema = z.object({
  bumpLevel: z.enum(['major', 'minor', 'patch']),
  commits: z.array(z.string()),
  newVersion: z.string(),
  previousVersion: z.string(),
  slug: z.string(),
});

export type RuleBump = z.infer<typeof RuleBumpSchema>;

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
