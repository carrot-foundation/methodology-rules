import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { eventHasMetadataAttribute } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export class HasMtrProcessor extends RuleDataProcessor {
  static RESULT_COMMENT = {
    attributeNotFound:
      'Open event with metadata attribute has-mtr was not found',
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

    const openEvent = document.externalEvents?.find((event) =>
      eventHasMetadataAttribute({
        event,
        eventNames: [DocumentEventName.OPEN],
        metadataName: DocumentEventAttributeName.HAS_MTR,
      }),
    );

    if (!openEvent) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: HasMtrProcessor.RESULT_COMMENT.attributeNotFound,
      });
    }

    const hasMtrValue = getEventAttributeValue(
      openEvent,
      DocumentEventAttributeName.HAS_MTR,
    );

    const resultStatus =
      typeof hasMtrValue === 'boolean'
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED;

    return mapToRuleOutput(ruleInput, resultStatus);
  }
}
