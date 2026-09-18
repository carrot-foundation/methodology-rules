import { BoldActorType } from '@carrot-fndn/shared/methodologies/bold/types';

import { PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC } from './privacy-flags.constants';

const { HAULER, PROCESSOR, RECYCLER, WASTE_GENERATOR } = BoldActorType;

export interface ParticipantOccurrence {
  preserveSensitiveData?: boolean | undefined;
  role: string;
}

export type ParticipantVisibility = 'private' | 'public';

export const resolveParticipantVisibility = (
  occurrences: readonly ParticipantOccurrence[],
): ParticipantVisibility | undefined => {
  if (
    occurrences.some(
      ({ preserveSensitiveData }) => preserveSensitiveData === true,
    )
  ) {
    return 'private';
  }

  const roles = new Set(occurrences.map(({ role }) => role));

  if (roles.has(WASTE_GENERATOR)) {
    return 'private';
  }

  if (roles.has(HAULER) && (roles.has(RECYCLER) || roles.has(PROCESSOR))) {
    return 'public';
  }

  if (
    occurrences.some(
      ({ preserveSensitiveData }) => preserveSensitiveData === false,
    )
  ) {
    return 'public';
  }

  const roleDefaults = [...roles]
    .map((role) => PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC.get(role))
    .filter((requiresPrivacy) => requiresPrivacy !== undefined);

  if (roleDefaults.length === 0) {
    return undefined;
  }

  return roleDefaults.includes(true) ? 'private' : 'public';
};
