import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import {
  and,
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

const { HAS_CDF, REPORT_TYPE } = DocumentEventAttributeName;
const { CDF } = ReportType;

export class CdfAttachmentVerificationProcessor extends ParentDocumentRuleProcessor<
  DocumentEvent[]
> {
  protected override evaluateResult(
    events: DocumentEvent[],
  ): EvaluateResultOutput {
    const resultStatus = events.every((event) =>
      isNonEmptyArray(event.attachments),
    )
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return {
      resultStatus,
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
