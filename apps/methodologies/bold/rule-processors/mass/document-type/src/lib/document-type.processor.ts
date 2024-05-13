import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { ParentDocumentRuleProcessor } from '@carrot-fndn/methodologies/bold/processors';
import {
  type Document,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

export class DocumentTypeProcessor extends ParentDocumentRuleProcessor<Document> {
  protected override evaluateResult(
    document: Document,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    const resultStatus =
      document.type === DocumentType.ORGANIC
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return { resultStatus };
  }

  protected override getRuleSubject(document: Document): Document | undefined {
    return document;
  }
}
