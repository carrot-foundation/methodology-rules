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
  // The isPublic of an ACTOR event that names its own role; undefined for any event whose roles are borrowed, which cannot disclose one.
  eventIsPublic?: boolean | undefined;
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

// Only roles the spec names count: a label outside it, such as Auditor, does not stop an occurrence being Hauler-only.
const isHaulerOnly = ({ roles }: ParticipantOccurrence): boolean => {
  const specRoles = [...roles].filter((role) =>
    PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC.has(role),
  );

  return specRoles.length === 1 && specRoles[0] === HAULER;
};

const isPublicRecyclerOrProcessor = ({
  eventIsPublic,
  roles,
}: ParticipantOccurrence): boolean =>
  eventIsPublic === true && (roles.has(RECYCLER) || roles.has(PROCESSOR));

export const resolveParticipantVisibility = (
  occurrences: readonly ParticipantOccurrence[],
): ParticipantVisibility | undefined => {
  const roles = participantRolesOf(occurrences);
  const holdsRecyclerOrProcessor = roles.has(RECYCLER) || roles.has(PROCESSOR);
  const disclosedByPublicRole = occurrences.some((occurrence) =>
    isPublicRecyclerOrProcessor(occurrence),
  );

  // Spec step 1 sets aside a Hauler-only flag once a Recycler or Processor on a public ACTOR event discloses the entity, so step 3 can decide.
  if (
    occurrences.some(
      (occurrence) =>
        occurrence.preserveSensitiveData === true &&
        !(disclosedByPublicRole && isHaulerOnly(occurrence)),
    )
  ) {
    return 'private';
  }

  if (roles.has(WASTE_GENERATOR)) {
    return 'private';
  }

  if (roles.has(HAULER) && holdsRecyclerOrProcessor) {
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
