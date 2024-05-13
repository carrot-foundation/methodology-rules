import type { Document } from '@carrot-fndn/methodologies/bold/types';
import type { RuleInput } from '@carrot-fndn/shared/rule/types';

import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { RuleStandardDataProcessor } from '@carrot-fndn/shared/rule/standard-data-processor';

export abstract class ParentDocumentRuleProcessor<
  Subject,
> extends RuleStandardDataProcessor<Document, Subject> {
  protected override async loadDocument(
    ruleInput: RuleInput,
  ): Promise<Document | undefined> {
    return loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.parentDocumentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );
  }
}
