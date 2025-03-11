import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { getOrDefault } from '@carrot-fndn/shared/helpers';
import {
  and,
  eventHasLabel,
  eventHasName,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventName,
  DocumentEventVehicleType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

const { ACTOR } = DocumentEventName;
const { HAULER } = MethodologyDocumentEventLabel;
const { VEHICLE_TYPE } = NewDocumentEventAttributeName;

type Subject = {
  externalEvents: DocumentEvent[];
};

export const NON_HAULER_REQUIRED_VEHICLE_TYPES = [
  DocumentEventVehicleType.SLUDGE_PIPES,
  DocumentEventVehicleType.CART,
] as const;

export const RESULT_COMMENT = {
  APPROVED: `The "${VEHICLE_TYPE}" attribute is set with a different type than "${NON_HAULER_REQUIRED_VEHICLE_TYPES.join(
    ', ',
  )}" and the "${HAULER}" actor event was declared correctly.`,
  NO_HAULER_ACTOR_EVENT: `The "${VEHICLE_TYPE}" attribute is set with a different type than "${NON_HAULER_REQUIRED_VEHICLE_TYPES.join(
    ', ',
  )}" and the "${HAULER}" actor event was not declared.`,
  NON_HAULER_REQUIRED_VEHICLE_TYPE: `The "${VEHICLE_TYPE}" attribute is set with a type that is ${NON_HAULER_REQUIRED_VEHICLE_TYPES.join(
    ', ',
  )} and the ${HAULER} actor event is not necessary.`,
} as const;

export class HaulerIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  private get RESULT_COMMENT() {
    return RESULT_COMMENT;
  }

  protected override evaluateResult({
    externalEvents,
  }: Subject): EvaluateResultOutput {
    const hasNonHaulerRequiredVehicleType = externalEvents.some(
      metadataAttributeValueIsAnyOf(
        VEHICLE_TYPE,
        NON_HAULER_REQUIRED_VEHICLE_TYPES,
      ),
    );

    if (hasNonHaulerRequiredVehicleType) {
      return {
        resultComment: this.RESULT_COMMENT.NON_HAULER_REQUIRED_VEHICLE_TYPE,
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    const hasHaulerActorEvent = externalEvents.some(
      and(
        (event) => eventHasLabel(event, HAULER),
        (event) => eventHasName(event, ACTOR),
      ),
    );

    return {
      resultComment: hasHaulerActorEvent
        ? this.RESULT_COMMENT.APPROVED
        : this.RESULT_COMMENT.NO_HAULER_ACTOR_EVENT,
      resultStatus: hasHaulerActorEvent
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED,
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    return {
      externalEvents: getOrDefault(document.externalEvents, []),
    };
  }
}
