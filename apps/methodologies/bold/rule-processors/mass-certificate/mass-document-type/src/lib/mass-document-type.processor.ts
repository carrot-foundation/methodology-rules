import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import { DocumentQueryService } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS,
  MASS_AUDIT,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  type Document,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export class MassDocumentTypeProcessor extends RuleDataProcessor {
  private ResultComment = {
    REJECTED: 'All mass documents must be of type Organic',
  };

  private documentQueryService = new DocumentQueryService(
    this.context.documentLoaderService,
  );

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const query = await this.documentQueryService.load({
      context: {
        s3KeyPrefix: ruleInput.documentKeyPrefix,
      },
      criteria: {
        relatedDocuments: [
          {
            parentDocument: {},
            ...MASS_AUDIT.match,
          },
        ],
      },
      documentId: String(ruleInput.parentDocumentId),
    });

    const massDocuments: Document[] = [];

    await query.iterator().each(({ document }) => {
      if (MASS.matches(mapDocumentReference(document))) {
        massDocuments.push(document);
      }
    });

    const resultValue =
      isNonEmptyArray(massDocuments) &&
      massDocuments.every(
        (massDocument) => massDocument.type === DocumentType.ORGANIC,
      );

    return mapToRuleOutput(
      ruleInput,
      resultValue ? RuleOutputStatus.APPROVED : RuleOutputStatus.REJECTED,
      {
        ...(!resultValue && {
          resultComment: this.ResultComment.REJECTED,
        }),
      },
    );
  }
}
