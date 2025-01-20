import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { eventHasMetadataAttribute } from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/recycling/organic/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  ReportType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { HAS_CDF, REPORT_TYPE } = DocumentEventAttributeName;
const { CDF } = ReportType;

export class HasCdfProcessor extends ParentDocumentRuleProcessor<
  DocumentEvent[]
> {
  private ResultComment = {
    REJECTED:
      'No event has attribute report-type equal to CDF or has-cdf equal to false',
  };

  protected override evaluateResult(
    events: DocumentEvent[],
  ): EvaluateResultOutput {
    const hasRequiredMetadata = events.some((event) =>
      [HAS_CDF, REPORT_TYPE].some((attributeName) =>
        eventHasMetadataAttribute({
          event,
          metadataName: attributeName,
          metadataValues: attributeName === HAS_CDF ? false : CDF,
        }),
      ),
    );

    const resultStatus = hasRequiredMetadata
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return {
      resultStatus,
      ...(resultStatus === RuleOutputStatus.REJECTED && {
        resultComment: this.ResultComment.REJECTED,
      }),
    };
  }

  protected override getRuleSubject(
    document: Document,
  ): DocumentEvent[] | undefined {
    return document.externalEvents;
  }
}
