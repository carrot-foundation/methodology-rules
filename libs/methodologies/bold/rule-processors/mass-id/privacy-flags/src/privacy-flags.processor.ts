import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type BoldDocument,
  type BoldDocumentEvent,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  NotValidatedEntry,
  PrivacyFlagsResultContent,
  PrivacyReviewReason,
} from './privacy-flags.result-content.types';

import {
  EVENT_PRIVACY_SPEC,
  type EventPrivacySpec,
  PRIVACY_REASON_CODES,
  RESULT_COMMENTS,
  SKIPPED_EVENT_NAMES,
} from './privacy-flags.constants';

interface RuleSubject {
  events: BoldDocumentEvent[];
}

export class PrivacyFlagsProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    events,
  }: RuleSubject): EvaluateResultOutput {
    const notValidated: NotValidatedEntry[] = [];
    const reviewReasons: PrivacyReviewReason[] = [];
    let validatedEvents = 0;

    for (const event of events) {
      if (SKIPPED_EVENT_NAMES.has(event.name)) {
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
}
