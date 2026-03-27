import * as semver from 'semver';

import type { BumpLevel } from './types';

export function bumpVersion(current: string, level: BumpLevel): string {
  const bumped = semver.inc(current, level);
  if (!bumped) throw new Error(`Invalid version: ${current}`);

  return bumped;
}

export function highestBump(bumps: BumpLevel[]): BumpLevel | undefined {
  const precedence: BumpLevel[] = ['patch', 'minor', 'major'];

  let highest: BumpLevel | undefined;
  for (const bump of bumps) {
    if (
      !highest ||
      precedence.indexOf(bump) > precedence.indexOf(highest)
    ) {
      highest = bump;
    }
  }

  return highest;
}
