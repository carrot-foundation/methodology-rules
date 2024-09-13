import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  type Document,
  DocumentSubtype,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

export class DocumentSubtypeProcessor extends ParentDocumentRuleProcessor<string> {
  private ResultComment = {
    REJECTED: 'Document subtype is not allowed by the BOLD Methodology',
  };

  protected override evaluateResult(ruleSubject: string): EvaluateResultOutput {
    const resultStatus = [
      'Wood and Wood Products',
      ...Object.values<string>(DocumentSubtype),
    ].includes(ruleSubject)
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? undefined
          : this.ResultComment.REJECTED,
      resultStatus,
    };
  }

  protected override getRuleSubject(document: Document): string | undefined {
    return document.subtype;
  }
}
