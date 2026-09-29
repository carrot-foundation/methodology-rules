import {
  BoldActorType,
  type BoldDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';

import {
  LEGACY_ACTOR_TYPE_ATTRIBUTE_NAME,
  PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC,
  ROLE_BY_LEGACY_ACTOR_TYPE,
} from './privacy-flags.constants';

const { HAULER, PROCESSOR, RECYCLER, WASTE_GENERATOR } = BoldActorType;

export interface ParticipantOccurrence {
  preserveSensitiveData?: boolean | undefined;
  role?: string | undefined;
}

export type ParticipantVisibility = 'private' | 'public';

export const actorEventRolesOf = ({
  label,
  metadata,
}: Pick<BoldDocumentEvent, 'label' | 'metadata'>): ReadonlySet<string> => {
  const legacyRoles = (metadata?.attributes ?? []).flatMap(
    ({ name, value }) => {
      const role =
        name === LEGACY_ACTOR_TYPE_ATTRIBUTE_NAME && typeof value === 'string'
          ? ROLE_BY_LEGACY_ACTOR_TYPE.get(value)
          : undefined;

      return role === undefined ? [] : [role];
    },
  );

  return new Set([...(label === undefined ? [] : [label]), ...legacyRoles]);
};

export const participantOccurrencesOf = (
  preserveSensitiveData: boolean | undefined,
  roles: ReadonlySet<string>,
): ParticipantOccurrence[] =>
  roles.size === 0
    ? [{ preserveSensitiveData }]
    : [...roles].map((role) => ({ preserveSensitiveData, role }));

export const participantRolesOf = (
  occurrences: readonly ParticipantOccurrence[],
): ReadonlySet<string> =>
  new Set(
    occurrences.flatMap(({ role }) => (role === undefined ? [] : [role])),
  );

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

  const roles = participantRolesOf(occurrences);

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
