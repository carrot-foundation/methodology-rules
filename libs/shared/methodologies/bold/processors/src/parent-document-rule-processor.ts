import type { BoldDocument } from '@carrot-fndn/shared/methodologies/bold/types';
import type { RuleInput } from '@carrot-fndn/shared/rule/types';

import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { RuleStandardDataProcessor } from '@carrot-fndn/shared/rule/standard-data-processor';

export abstract class ParentDocumentRuleProcessor<
  Subject,
> extends RuleStandardDataProcessor<BoldDocument, Subject> {
  protected override async loadDocument(
    ruleInput: RuleInput,
  ): Promise<BoldDocument | undefined> {
    return loadDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.parentDocumentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );
  }
}
