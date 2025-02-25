import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  DocumentCategory,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

export class DocumentCategoryProcessor extends ParentDocumentRuleProcessor<DocumentCategory> {
  private resultComment = {
    REJECTED: 'The document does not have a category of Mass',
  };

  protected override evaluateResult(
    category: DocumentCategory,
  ): EvaluateResultOutput {
    const resultStatus =
      category === DocumentCategory.MASS
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return {
      resultComment:
        resultStatus === RuleOutputStatus.APPROVED
          ? undefined
          : this.resultComment.REJECTED,
      resultStatus,
    };
  }

  protected override getRuleSubject(
    document: Document,
  ): DocumentCategory | undefined {
    return document.category as DocumentCategory;
  }
}
