import { DocumentQueryService } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  MASS,
  MASS_AUDIT,
} from '@carrot-fndn/methodologies/bold/recycling/organic/matchers';
import {
  type Document,
  DocumentType,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { mapDocumentReference } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { isNonEmptyArray } from '@carrot-fndn/shared/helpers';
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
