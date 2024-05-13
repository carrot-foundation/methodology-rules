import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/getters';
import { loadParentDocument } from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  and,
  eventNameIsAnyOf,
  hasWeightFormat,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
} from '@carrot-fndn/methodologies/bold/types';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { isNil, toDocumentKey } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

export class NumericWeightValuesProcessor extends RuleDataProcessor {
  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const document = await loadParentDocument(
      this.context.documentLoaderService,
      toDocumentKey({
        documentId: ruleInput.parentDocumentId,
        documentKeyPrefix: ruleInput.documentKeyPrefix,
      }),
    );

    if (!document?.externalEvents) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED);
    }

    const { MOVE } = DocumentEventName;
    const { WEIGHING } = DocumentEventMoveType;
    const { MOVE_TYPE } = DocumentEventAttributeName;

    const events = document.externalEvents.filter(
      and(
        eventNameIsAnyOf([MOVE]),
        metadataAttributeValueIsAnyOf(MOVE_TYPE, [WEIGHING]),
      ),
    );

    const resultStatus = events.every((event) => {
      const vehicleGrossWeight = getEventAttributeValue(
        event,
        DocumentEventAttributeName.VEHICLE_GROSS_WEIGHT,
      );
      const vehicleWeight = getEventAttributeValue(
        event,
        DocumentEventAttributeName.VEHICLE_WEIGHT,
      );
      const loadNetWeight = getEventAttributeValue(
        event,
        DocumentEventAttributeName.LOAD_NET_WEIGHT,
      );

      return [vehicleWeight, vehicleGrossWeight, loadNetWeight].every(
        (value) => isNil(value) || hasWeightFormat(String(value)),
      );
    })
      ? RuleOutputStatus.APPROVED
      : RuleOutputStatus.REJECTED;

    return mapToRuleOutput(ruleInput, resultStatus);
  }
}
