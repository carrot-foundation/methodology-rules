import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { isRecycledEvent } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

interface RuleSubject {
  recycledEvent: DocumentEvent | undefined;
}

export class AuditEligibilityCheckProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  private readonly ELIGIBLE_DATE = new Date(
    Date.UTC(new Date().getUTCFullYear() - 1, 0, 1),
  );

  private readonly RESULT_COMMENT = {
    ELIGIBLE: `The '${DocumentEventName.RECYCLED}' event was created after ${this.ELIGIBLE_DATE.toISOString().split('T')[0]}.`,
    INELIGIBLE: `The '${DocumentEventName.RECYCLED}' event was created before ${this.ELIGIBLE_DATE.toISOString().split('T')[0]}.`,
    MISSING_RECYCLED_EVENT: `The '${DocumentEventName.RECYCLED}' event is missing.`,
  } as const;

  protected evaluateResult(ruleSubject: RuleSubject): EvaluateResultOutput {
    const { recycledEvent } = ruleSubject;

    if (isNil(recycledEvent)) {
      return {
        resultComment: this.RESULT_COMMENT.MISSING_RECYCLED_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const eventDate = new Date(recycledEvent.externalCreatedAt as string);
    const isEligible = eventDate.getTime() > this.ELIGIBLE_DATE.getTime();

    return {
      resultComment: isEligible
        ? this.RESULT_COMMENT.ELIGIBLE
        : this.RESULT_COMMENT.INELIGIBLE,
      resultStatus: isEligible
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED,
    };
  }

  protected getRuleSubject(document: Document): RuleSubject {
    const recycledEvent = document.externalEvents?.find(isRecycledEvent);

    if (isNil(recycledEvent)) {
      return { recycledEvent: undefined };
    }

    return { recycledEvent };
  }
}
