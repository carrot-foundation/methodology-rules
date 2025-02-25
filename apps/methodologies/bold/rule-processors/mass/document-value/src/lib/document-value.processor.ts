import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';
import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

export class DocumentValueProcessor extends ParentDocumentRuleProcessor<Document> {
  protected override evaluateResult(
    data: Document,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    const resultStatus =
      data.currentValue > 0
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return {
      resultStatus,
    };
  }

  protected override getRuleSubject(document: Document): Document | undefined {
    return document;
  }
}
