import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { eventHasMetadataAttribute } from '@carrot-fndn/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  ReportType,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { HAS_CDF, REPORT_TYPE } = DocumentEventAttributeName;
const { CDF } = ReportType;
const { END } = DocumentEventName;

export class HasCdfProcessor extends ParentDocumentRuleProcessor<
  DocumentEvent[]
> {
  private ResultComment = {
    REJECTED:
      'The END event does not have attribute has-cdf with value equal to false or report-type with value equal to CDF',
  };

  protected override evaluateResult(
    events: DocumentEvent[],
  ): EvaluateResultOutput {
    const resultStatus = events.some((event) =>
      [HAS_CDF, REPORT_TYPE].some((attributeName) =>
        eventHasMetadataAttribute({
          event,
          eventNames: [END],
          metadataName: attributeName,
          metadataValues: attributeName === HAS_CDF ? false : CDF,
        }),
      ),
    )
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
