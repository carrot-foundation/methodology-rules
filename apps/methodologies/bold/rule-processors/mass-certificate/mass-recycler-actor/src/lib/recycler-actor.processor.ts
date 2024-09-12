import type { DocumentQuery } from '@carrot-fndn/methodologies/bold/io-helpers';

import { DocumentQueryService } from '@carrot-fndn/methodologies/bold/io-helpers';
import { MASS, MASS_AUDIT } from '@carrot-fndn/methodologies/bold/matchers';
import {
  and,
  eventHasRecyclerActor,
  eventNameIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

const { ACTOR } = DocumentEventName;

export class RecyclerActorDocumentProcessor extends RuleDataProcessor {
  private ResultComment = {
    APPROVED:
      'The participants declared as Recycler are the same in all masses',
    REJECTED:
      'The participants declared as Recycler are not the same in all masses',
  };

  private evaluateResult(
    ruleInput: RuleInput,
    recyclerIds: Set<string | undefined>,
  ) {
    if (recyclerIds.has(undefined)) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.ResultComment.REJECTED,
      });
    }

    const result = recyclerIds.size === 1;

    return mapToRuleOutput(
      ruleInput,
      result ? RuleOutputStatus.APPROVED : RuleOutputStatus.REJECTED,
      {
        resultComment: result
          ? this.ResultComment.APPROVED
          : this.ResultComment.REJECTED,
      },
    );
  }

  private async generateDocumentQuery(
    documentKeyPrefix: string,
    documentId: string,
  ) {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    return documentQueryService.load({
      context: {
        s3KeyPrefix: documentKeyPrefix,
      },
      criteria: {
        parentDocument: {
          omit: true,
          relatedDocuments: [
            {
              ...MASS_AUDIT.match,
              omit: true,
              parentDocument: MASS.match,
            },
          ],
        },
      },
      documentId,
    });
  }

  private async getRuleSubject(documentQuery: DocumentQuery<Document>) {
    const recyclerIds = new Set<string | undefined>();

    await documentQuery.iterator().each(({ document }) => {
      const id = document.externalEvents?.find(
        and(eventNameIsAnyOf([ACTOR]), (event) => eventHasRecyclerActor(event)),
      )?.participant.id;

      recyclerIds.add(id);
    });

    return recyclerIds;
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const documentQuery = await this.generateDocumentQuery(
      ruleInput.documentKeyPrefix,
      ruleInput.documentId,
    );

    const recyclerIds = await this.getRuleSubject(documentQuery);

    return this.evaluateResult(ruleInput, recyclerIds);
  }
}
