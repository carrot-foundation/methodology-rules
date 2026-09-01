import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type BoldDocument,
  type BoldDocumentEvent,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

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

const { ACTOR } = BoldDocumentEventName;

interface RuleSubject {
  events: BoldDocumentEvent[];
}

export class PrivacyFlagsProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    events,
  }: RuleSubject): EvaluateResultOutput {
    const notValidated: NotValidatedEntry[] = [];
    const reviewReasons: PrivacyReviewReason[] = [];
    const participantRoles = this.getParticipantRoles(events);
    let validatedEvents = 0;

    for (const event of events) {
      const participantRole =
        event.name === ACTOR
          ? event.label
          : participantRoles.get(event.participant.id);

      this.validatePreserveSensitiveDataIfSpecified(
        event,
        participantRole,
        reviewReasons,
      );

      if (SKIPPED_EVENT_NAMES.has(event.name)) {
        continue;
      }

      if (event.name === ACTOR) {
        if (this.validateActorEvent(event, reviewReasons)) {
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
      this.validateEvent(event, eventSpec, notValidated, reviewReasons);
    }

    const resultContent: PrivacyFlagsResultContent = {
      notValidated,
      reviewReasons,
    };

    if (reviewReasons.length > 0) {
      return {
        resultComment: reviewReasons
          .map((reason) => reason.description)
          .join(' '),
        resultContent,
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

  private getParticipantRoles(
    events: BoldDocumentEvent[],
  ): ReadonlyMap<string, string> {
    const participantRoles = new Map<string, string>();

    for (const event of events) {
      if (
        event.name === ACTOR &&
        event.label !== undefined &&
        ASSERTABLE_ACTOR_LABELS.has(event.label)
      ) {
        participantRoles.set(event.participant.id, event.label);
      }
    }

    return participantRoles;
  }

  private validateActorEvent(
    event: BoldDocumentEvent,
    reviewReasons: PrivacyReviewReason[],
  ): boolean {
    const { label } = event;

    if (label === undefined || !ASSERTABLE_ACTOR_LABELS.has(label)) {
      return false;
    }

    if (!event.isPublic) {
      reviewReasons.push({
        actual: event.isPublic,
        code: PRIVACY_REASON_CODES.EVENT_IS_PUBLIC,
        description: RESULT_COMMENTS.reviewRequired.ACTOR_IS_PUBLIC(
          label,
          true,
        ),
        eventLabel: label,
        eventName: event.name,
        expected: true,
        field: 'isPublic',
      });
    }

    return true;
  }

  private validateEvent(
    event: BoldDocumentEvent,
    eventSpec: EventPrivacySpec,
    notValidated: NotValidatedEntry[],
    reviewReasons: PrivacyReviewReason[],
  ): void {
    if (event.isPublic !== eventSpec.isPublic) {
      reviewReasons.push({
        actual: event.isPublic,
        code: PRIVACY_REASON_CODES.EVENT_IS_PUBLIC,
        description: RESULT_COMMENTS.reviewRequired.EVENT_IS_PUBLIC(
          event.name,
          eventSpec.isPublic,
        ),
        eventName: event.name,
        expected: eventSpec.isPublic,
        field: 'isPublic',
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
        reviewReasons.push({
          actual: attribute.isPublic,
          attributeName: attribute.name,
          code: PRIVACY_REASON_CODES.ATTRIBUTE_IS_PUBLIC,
          description: RESULT_COMMENTS.reviewRequired.ATTRIBUTE_IS_PUBLIC(
            event.name,
            attribute.name,
            attributeSpec.isPublic,
          ),
          eventName: event.name,
          expected: attributeSpec.isPublic,
          field: 'isPublic',
        });
      }

      if ((attribute.sensitive === true) !== attributeSpec.sensitive) {
        reviewReasons.push({
          actual: attribute.sensitive,
          attributeName: attribute.name,
          code: PRIVACY_REASON_CODES.ATTRIBUTE_SENSITIVE,
          description: RESULT_COMMENTS.reviewRequired.ATTRIBUTE_SENSITIVE(
            event.name,
            attribute.name,
            attributeSpec.sensitive,
          ),
          eventName: event.name,
          expected: attributeSpec.sensitive,
          field: 'sensitive',
        });
      }
    }
  }

  private validatePreserveSensitiveDataIfSpecified(
    event: BoldDocumentEvent,
    participantRole: string | undefined,
    reviewReasons: PrivacyReviewReason[],
  ): void {
    if (event.preserveSensitiveData === undefined) {
      return;
    }

    if (participantRole === undefined) {
      return;
    }

    const expected =
      PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC.get(participantRole);

    if (expected === undefined || event.preserveSensitiveData === expected) {
      return;
    }

    reviewReasons.push({
      actual: event.preserveSensitiveData,
      code:
        event.name === ACTOR
          ? PRIVACY_REASON_CODES.ACTOR_PRESERVE_SENSITIVE_DATA
          : PRIVACY_REASON_CODES.EVENT_PRESERVE_SENSITIVE_DATA,
      description: RESULT_COMMENTS.reviewRequired.EVENT_PRESERVE_SENSITIVE_DATA(
        event.name,
        participantRole,
        expected,
      ),
      ...(event.name === ACTOR && event.label !== undefined
        ? { eventLabel: event.label }
        : {}),
      eventName: event.name,
      expected,
      field: 'preserveSensitiveData',
      participantRole,
    });
  }
}
