import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  eventHasMetadataAttribute,
  eventHasNonEmptyStringAttribute,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

export class CdfReasonDismissalProcessor extends ParentDocumentRuleProcessor<DocumentEvent> {
  private ResultComment = {
    APPROVED: 'The END event has the has-reason-dismissal-cdf attribute',
    REJECTED:
      'The END event has the has-cdf attribute equal false and does not have the has-reason-dismissal-cdf',
  };

  protected override evaluateResult(
    event: DocumentEvent,
  ): EvaluateResultOutput {
    const resultStatus = eventHasNonEmptyStringAttribute(
      event,
      DocumentEventAttributeName.HAS_REASON_DISMISSAL_CDF,
    )
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? this.ResultComment.APPROVED
          : this.ResultComment.REJECTED,
      resultStatus,
    };
  }

  protected override getMissingRuleSubjectResultComment(): string {
    return 'Rule not applicable: The END event has the CDF';
  }

  protected override getRuleSubject(
    document: Document,
  ): DocumentEvent | undefined {
    return document.externalEvents?.find((event) =>
      eventHasMetadataAttribute({
        event,
        eventNames: [DocumentEventName.END],
        metadataName: DocumentEventAttributeName.HAS_CDF,
        metadataValues: false,
      }),
    );
  }
}
