import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  eventHasRecyclerActor,
  isActorEvent,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export class RecyclerActorProcessor extends RuleDataProcessor {
  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const document = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.parentDocumentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    if (!document) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED);
    }

    const resultStatus =
      document.externalEvents?.filter(
        (event) => isActorEvent(event) && eventHasRecyclerActor(event),
      ).length === 1
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return mapToRuleOutput(ruleInput, resultStatus);
  }
}
