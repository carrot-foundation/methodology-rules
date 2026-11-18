import type { RenderedRuleFinding } from '@carrot-fndn/shared/rule/result';
import type { RuleFinding } from '@carrot-fndn/shared/rule/types';

import {
  BoldActorType,
  type BoldDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type { PrivacyReviewReason } from './privacy-flags.result-content.types';

import {
  LEGACY_ACTOR_TYPE_ATTRIBUTE_NAME,
  PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC,
  ROLE_BY_LEGACY_ACTOR_TYPE,
} from './privacy-flags.constants';

const { HAULER, PROCESSOR, RECYCLER, WASTE_GENERATOR } = BoldActorType;

export interface ParticipantOccurrence {
  preserveSensitiveData?: boolean | undefined;
  roles: ReadonlySet<string>;
}

export type ParticipantVisibility = 'private' | 'public';

export interface PrivacyReview {
  finding: RuleFinding;
  reason: PrivacyReviewReason;
}

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

export const addPrivacyReview = (
  reviews: PrivacyReview[],
  { finding, message }: RenderedRuleFinding,
  buildReason: (description: string) => PrivacyReviewReason,
): void => {
  reviews.push({ finding, reason: buildReason(message) });
};

export const participantRolesOf = (
  occurrences: readonly ParticipantOccurrence[],
): ReadonlySet<string> =>
  new Set(occurrences.flatMap(({ roles }) => [...roles]));

const isHaulerOnly = ({ roles }: ParticipantOccurrence): boolean =>
  roles.size === 1 && roles.has(HAULER);

const holdsRecyclerOrProcessor = (roles: ReadonlySet<string>): boolean =>
  roles.has(RECYCLER) || roles.has(PROCESSOR);

export const resolveParticipantVisibility = (
  occurrences: readonly ParticipantOccurrence[],
): ParticipantVisibility | undefined => {
  const roles = participantRolesOf(occurrences);
  // Spec step 1 sets aside a Hauler-only flag once a public role discloses the entity, so step 3 can decide.
  const setsHaulerOnlyFlagAside = holdsRecyclerOrProcessor(roles);

  if (
    occurrences.some(
      (occurrence) =>
        occurrence.preserveSensitiveData === true &&
        !(setsHaulerOnlyFlagAside && isHaulerOnly(occurrence)),
    )
  ) {
    return 'private';
  }

  if (roles.has(WASTE_GENERATOR)) {
    return 'private';
  }

  if (roles.has(HAULER) && holdsRecyclerOrProcessor(roles)) {
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
