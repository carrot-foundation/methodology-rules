import { loadParentDocument } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  eventHasMetadataAttribute,
  eventHasNonEmptyStringAttribute,
} from '@carrot-fndn/methodologies/bold/recycling/organic/predicates';
import { DocumentEventAttributeName } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/recycling/organic/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventName } from '@carrot-fndn/shared/types';

export class MoveTypeProcessor extends RuleDataProcessor {
  static resultComment = {
    notAllEventsHaveNonEmptyMoveType:
      'Some event with move_type attribute has an empty value',
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

    const { externalEvents } = document;

    const resultStatus = (externalEvents ?? []).every((event) => {
      const hasMoveType = eventHasMetadataAttribute({
        event,
        eventNames: [MethodologyDocumentEventName.MOVE],
        metadataName: DocumentEventAttributeName.MOVE_TYPE,
      });

      return hasMoveType
        ? eventHasNonEmptyStringAttribute(
            event,
            DocumentEventAttributeName.MOVE_TYPE,
          )
        : true;
    })
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return mapToRuleOutput(
      ruleInput,
      resultStatus,
      resultStatus === RuleOutputStatus.APPROVED
        ? undefined
        : {
            resultComment:
              MoveTypeProcessor.resultComment.notAllEventsHaveNonEmptyMoveType,
          },
    );
  }
}
