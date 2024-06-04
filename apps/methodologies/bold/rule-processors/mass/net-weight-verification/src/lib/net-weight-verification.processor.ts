import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  and,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { DOCUMENT_NOT_FOUND_RESULT_COMMENT } from '@carrot-fndn/methodologies/bold/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { extractWeightAttributes } from './net-weight-verification.utils';

export class NetWeightVerificationProcessor extends RuleDataProcessor {
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

    const { MOVE } = DocumentEventName;
    const { WEIGHING } = DocumentEventMoveType;
    const { MOVE_TYPE } = DocumentEventAttributeName;

    const events = (document.externalEvents ?? []).filter(
      and(
        eventNameIsAnyOf([MOVE]),
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [WEIGHING]),
      ),
    );

    const resultStatus = events.every((event) => {
      const attributes = extractWeightAttributes(event);

      if (!attributes) {
        return true;
      }

      const { loadNetWeight, vehicleGrossWeight, vehicleWeight } = attributes;

      return loadNetWeight === vehicleGrossWeight - vehicleWeight;
    })
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return mapToRuleOutput(ruleInput, resultStatus);
  }
}
