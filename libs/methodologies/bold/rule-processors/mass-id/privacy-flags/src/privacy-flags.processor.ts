import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { RuleFinding } from '@carrot-fndn/shared/rule/types';

import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type BoldDocument,
  type BoldDocumentEvent,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type { ParticipantOccurrence } from './privacy-flags.helpers';
import type {
  NotValidatedEntry,
  PrivacyFlagsResultContent,
  PrivacyReviewReason,
} from './privacy-flags.result-content.types';

import {
  ASSERTABLE_ACTOR_LABELS,
  EVENT_PRIVACY_SPEC,
  type EventPrivacySpec,
  PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC,
  PRIVACY_REASON_CODES,
  RESULT_COMMENTS,
  SKIPPED_EVENT_NAMES,
} from './privacy-flags.constants';
import { PRIVACY_FLAGS_FINDINGS } from './privacy-flags.findings';
import {
  actorEventRolesOf,
  participantOccurrencesOf,
  participantRolesOf,
  resolveParticipantVisibility,
} from './privacy-flags.helpers';

const { ACTOR } = BoldDocumentEventName;

interface PrivacyReview {
  finding: RuleFinding;
  reason: PrivacyReviewReason;
}

interface RuleSubject {
  events: BoldDocumentEvent[];
}

export class PrivacyFlagsProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    events,
  }: RuleSubject): EvaluateResultOutput {
    const notValidated: NotValidatedEntry[] = [];
    const reviews: PrivacyReview[] = [];
    const participantRoles = this.getParticipantRoles(events);
    const occurrences = new Map<string, ParticipantOccurrence[]>();
    let validatedEvents = 0;

    for (const event of events) {
      const participantRolesForEvent =
        this.getPreserveSensitiveDataParticipantRoles(event, participantRoles);

      this.collectParticipantOccurrences(
        event,
        participantRolesForEvent,
        occurrences,
      );

      this.validatePreserveSensitiveDataIfSpecified(
        event,
        participantRolesForEvent,
        reviews,
      );

      if (SKIPPED_EVENT_NAMES.has(event.name)) {
        continue;
      }

      if (event.name === ACTOR) {
        if (this.validateActorEvent(event, reviews)) {
          validatedEvents += 1;
        }

        continue;
      }

      const eventSpec = EVENT_PRIVACY_SPEC.get(event.name);

      if (eventSpec === undefined) {
        notValidated.push({ eventName: event.name });
        continue;
      }

      validatedEvents += 1;
      this.validateEvent(event, eventSpec, notValidated, reviews);
    }

    this.validatePreserveSensitiveDataIsDeclared(occurrences, reviews);

    const resultContent: PrivacyFlagsResultContent = {
      notValidated,
      reviewReasons: reviews.map(({ reason }) => reason),
    };

    if (reviews.length > 0) {
      return {
        resultComment: reviews
          .map(({ reason }) => reason.description)
          .join(' '),
        resultContent,
        resultFindings: reviews.map(({ finding }) => finding),
        resultStatus: 'REVIEW_REQUIRED',
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.ALL_FLAGS_MATCH(validatedEvents),
      resultContent,
      resultStatus: 'PASSED',
    };
  }

  protected override getRuleSubject(document: BoldDocument): RuleSubject {
    return { events: document.externalEvents ?? [] };
  }

  private collectParticipantOccurrences(
    event: BoldDocumentEvent,
    participantRoles: ReadonlySet<string>,
    occurrences: Map<string, ParticipantOccurrence[]>,
  ): void {
    occurrences.set(event.participant.id, [
      ...(occurrences.get(event.participant.id) ?? []),
      ...participantOccurrencesOf(
        event.preserveSensitiveData,
        participantRoles,
      ),
    ]);
  }

  private getParticipantRoles(
    events: BoldDocumentEvent[],
  ): ReadonlyMap<string, ReadonlySet<string>> {
    const participantRoles = new Map<string, Set<string>>();

    for (const event of events) {
      if (event.name !== ACTOR) {
        continue;
      }

      const roles = participantRoles.get(event.participant.id) ?? new Set();

      for (const role of actorEventRolesOf(event)) {
        if (ASSERTABLE_ACTOR_LABELS.has(role)) {
          roles.add(role);
        }
      }

      if (roles.size > 0) {
        participantRoles.set(event.participant.id, roles);
      }
    }

    return participantRoles;
  }

  private getPreserveSensitiveDataParticipantRoles(
    event: BoldDocumentEvent,
    participantRoles: ReadonlyMap<string, ReadonlySet<string>>,
  ): ReadonlySet<string> {
    const actorRoles =
      event.name === ACTOR ? actorEventRolesOf(event) : new Set<string>();

    if (actorRoles.size > 0) {
      return actorRoles;
    }

    return participantRoles.get(event.participant.id) ?? new Set();
  }

  private validateActorEvent(
    event: BoldDocumentEvent,
    reviews: PrivacyReview[],
  ): boolean {
    const { label } = event;

    if (label === undefined || !ASSERTABLE_ACTOR_LABELS.has(label)) {
      return false;
    }

    if (!event.isPublic) {
      const { finding, message } = PRIVACY_FLAGS_FINDINGS.render(
        'REVIEW_REQUIRED.ACTOR_IS_PUBLIC',
        label,
        true,
      );

      reviews.push({
        finding,
        reason: {
          actual: event.isPublic,
          code: PRIVACY_REASON_CODES.EVENT_IS_PUBLIC,
          description: message,
          eventLabel: label,
          eventName: event.name,
          expected: true,
          field: 'isPublic',
        },
      });
    }

    return true;
  }

  private validateEvent(
    event: BoldDocumentEvent,
    eventSpec: EventPrivacySpec,
    notValidated: NotValidatedEntry[],
    reviews: PrivacyReview[],
  ): void {
    if (event.isPublic !== eventSpec.isPublic) {
      const { finding, message } = PRIVACY_FLAGS_FINDINGS.render(
        'REVIEW_REQUIRED.EVENT_IS_PUBLIC',
        event.name,
        eventSpec.isPublic,
      );

      reviews.push({
        finding,
        reason: {
          actual: event.isPublic,
          code: PRIVACY_REASON_CODES.EVENT_IS_PUBLIC,
          description: message,
          eventName: event.name,
          expected: eventSpec.isPublic,
          field: 'isPublic',
        },
      });
    }

    for (const attribute of event.metadata?.attributes ?? []) {
      const attributeSpec = eventSpec.attributes.get(attribute.name);

      if (attributeSpec === undefined) {
        notValidated.push({
          attributeName: attribute.name,
          eventName: event.name,
        });
        continue;
      }

      if (attribute.isPublic !== attributeSpec.isPublic) {
        const { finding, message } = PRIVACY_FLAGS_FINDINGS.render(
          'REVIEW_REQUIRED.ATTRIBUTE_IS_PUBLIC',
          event.name,
          attribute.name,
          attributeSpec.isPublic,
        );

        reviews.push({
          finding,
          reason: {
            actual: attribute.isPublic,
            attributeName: attribute.name,
            code: PRIVACY_REASON_CODES.ATTRIBUTE_IS_PUBLIC,
            description: message,
            eventName: event.name,
            expected: attributeSpec.isPublic,
            field: 'isPublic',
          },
        });
      }

      if ((attribute.sensitive === true) !== attributeSpec.sensitive) {
        const { finding, message } = PRIVACY_FLAGS_FINDINGS.render(
          'REVIEW_REQUIRED.ATTRIBUTE_SENSITIVE',
          event.name,
          attribute.name,
          attributeSpec.sensitive,
        );

        reviews.push({
          finding,
          reason: {
            actual: attribute.sensitive,
            attributeName: attribute.name,
            code: PRIVACY_REASON_CODES.ATTRIBUTE_SENSITIVE,
            description: message,
            eventName: event.name,
            expected: attributeSpec.sensitive,
            field: 'sensitive',
          },
        });
      }
    }
  }

  private validatePreserveSensitiveDataIfSpecified(
    event: BoldDocumentEvent,
    participantRoles: ReadonlySet<string>,
    reviews: PrivacyReview[],
  ): void {
    if (event.preserveSensitiveData === undefined) {
      return;
    }

    for (const participantRole of participantRoles) {
      const expected =
        PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC.get(participantRole);

      if (expected === undefined || event.preserveSensitiveData === expected) {
        continue;
      }

      const { finding, message } = PRIVACY_FLAGS_FINDINGS.render(
        'REVIEW_REQUIRED.EVENT_PRESERVE_SENSITIVE_DATA',
        event.name,
        participantRole,
        expected,
      );

      reviews.push({
        finding,
        reason: {
          actual: event.preserveSensitiveData,
          code:
            event.name === ACTOR
              ? PRIVACY_REASON_CODES.ACTOR_PRESERVE_SENSITIVE_DATA
              : PRIVACY_REASON_CODES.EVENT_PRESERVE_SENSITIVE_DATA,
          description: message,
          ...(event.name === ACTOR && event.label !== undefined
            ? { eventLabel: event.label }
            : {}),
          eventName: event.name,
          expected,
          field: 'preserveSensitiveData',
          participantRole,
        },
      });
    }
  }

  private validatePreserveSensitiveDataIsDeclared(
    occurrences: ReadonlyMap<string, ParticipantOccurrence[]>,
    reviews: PrivacyReview[],
  ): void {
    for (const participantOccurrences of occurrences.values()) {
      if (resolveParticipantVisibility(participantOccurrences) !== 'private') {
        continue;
      }

      for (const participantRole of participantRolesOf(
        participantOccurrences,
      )) {
        if (
          PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC.get(participantRole) !== true
        ) {
          continue;
        }

        const roleDeclared = participantOccurrences.some(
          ({ preserveSensitiveData, role }) =>
            role === participantRole && preserveSensitiveData !== undefined,
        );

        if (roleDeclared) {
          continue;
        }

        const { finding, message } = PRIVACY_FLAGS_FINDINGS.render(
          'REVIEW_REQUIRED.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING',
          participantRole,
        );

        reviews.push({
          finding,
          reason: {
            actual: undefined,
            code: PRIVACY_REASON_CODES.PARTICIPANT_PRESERVE_SENSITIVE_DATA_MISSING,
            description: message,
            eventLabel: participantRole,
            eventName: ACTOR,
            expected: true,
            field: 'preserveSensitiveData',
            participantRole,
          },
        });
      }
    }
  }
}
