import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import { isActorEventWithSourceActorType } from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export class PrimaryParticipantProcessor extends RuleDataProcessor {
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

    const source = document.externalEvents?.find(
      isActorEventWithSourceActorType,
    );

    const resultStatus =
      source?.participant.id === document.primaryParticipant.id
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return mapToRuleOutput(ruleInput, resultStatus);
  }
}
