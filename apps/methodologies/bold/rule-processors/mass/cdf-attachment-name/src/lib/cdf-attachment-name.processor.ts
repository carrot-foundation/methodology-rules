import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { getDocumentEventAttachmentByLabel } from '@carrot-fndn/methodologies/bold/getters';
import {
  and,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  ReportType,
  ReportTypeLiteralName,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const { HAS_CDF, REPORT_TYPE } = DocumentEventAttributeName;
const { CDF } = ReportType;

export class CdfAttachmentNameProcessor extends ParentDocumentRuleProcessor<DocumentEvent> {
  private ResultComments = {
    REJECTED: 'The CDF file name is not correct',
    RULE_NOT_APPLICABLE:
      'Rule not applicable: No event found with "has-cdf" equal to true',
  };

  protected override evaluateResult(
    event: DocumentEvent,
  ): EvaluateResultOutput {
    const resultStatus = [CDF, ReportTypeLiteralName.CDF].some((value) =>
      getDocumentEventAttachmentByLabel(event, value),
    )
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return {
      resultStatus,
      ...(resultStatus === RuleOutputStatus.REJECTED && {
        resultComment: this.ResultComments.REJECTED,
      }),
    };
  }

  protected override getMissingRuleSubjectResultComment(): string {
    return this.ResultComments.RULE_NOT_APPLICABLE;
  }

  protected override getRuleSubject(
    document: Document,
  ): DocumentEvent | undefined {
    return document.externalEvents?.find(
      and(
        metadataAttributeValueIsAnyOf(HAS_CDF, [true]),
        metadataAttributeValueIsAnyOf(REPORT_TYPE, [CDF]),
      ),
    );
  }
}
