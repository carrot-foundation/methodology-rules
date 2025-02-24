import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  and,
  metadataAttributeNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  ReportType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { HAS_CDF, REPORT_DATE_ISSUED, REPORT_NUMBER, REPORT_TYPE } =
  DocumentEventAttributeName;
const { CDF } = ReportType;

export class CdfFieldsProcessor extends ParentDocumentRuleProcessor<
  DocumentEvent[]
> {
  private ResulComment = {
    REJECTED: `All events with CDF reports must have a ${REPORT_NUMBER} and a ${REPORT_DATE_ISSUED}.`,
  };

  protected override evaluateResult(
    events: DocumentEvent[],
  ): EvaluateResultOutput {
    const resultStatus = events.every(
      and(
        metadataAttributeNameIsAnyOf([REPORT_NUMBER]),
        metadataAttributeNameIsAnyOf([REPORT_DATE_ISSUED]),
      ),
    )
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return {
      resultStatus,
      ...(resultStatus === RuleOutputStatus.REJECTED && {
        resultComment: this.ResulComment.REJECTED,
      }),
    };
  }

  protected override getRuleSubject(
    document: Document,
  ): DocumentEvent[] | undefined {
    return document.externalEvents?.filter(
      and(
        metadataAttributeValueIsAnyOf(REPORT_TYPE, [CDF]),
        metadataAttributeValueIsAnyOf(HAS_CDF, [true]),
      ),
    );
  }
}
