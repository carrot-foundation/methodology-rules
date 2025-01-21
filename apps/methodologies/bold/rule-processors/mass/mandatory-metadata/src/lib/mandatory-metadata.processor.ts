import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  and,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export class MandatoryMetadataProcessor extends RuleDataProcessor {
  static resultComment = {
    eventNotFound:
      'The OPEN event with metadata move-type = Pick-up or Shipment-request was not found',
  };

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const document = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.parentDocumentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    if (!document) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: DOCUMENT_NOT_FOUND_RESULT_COMMENT,
      });
    }

    const { MOVE_TYPE } = DocumentEventAttributeName;
    const { OPEN } = DocumentEventName;
    const { PICK_UP, SHIPMENT_REQUEST } = DocumentEventMoveType;

    const pickUpEventPresent = document.externalEvents?.find(
      and(
        eventNameIsAnyOf([OPEN]),
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [PICK_UP, SHIPMENT_REQUEST]),
      ),
    );

    if (!pickUpEventPresent) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: MandatoryMetadataProcessor.resultComment.eventNotFound,
      });
    }

    return mapToRuleOutput(ruleInput, RuleOutputStatus.APPROVED);
  }
}
