import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import { getOrDefault, isNonEmptyString } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventHasName } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const {
  DRIVER_IDENTIFIER,
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
  VEHICLE_TYPE,
} = DocumentEventAttributeName;
const { PICK_UP } = DocumentEventName;
const { SLUDGE_PIPES } = DocumentEventVehicleType;

export const RESULT_COMMENTS = {
  DRIVER_AND_JUSTIFICATION_PROVIDED: `In the ${PICK_UP} event, both the "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}" and "${DRIVER_IDENTIFIER}" were provided, but only one is allowed.`,
  DRIVER_IDENTIFIER: `In the ${PICK_UP} event, the "${DRIVER_IDENTIFIER}" was provided.`,
  JUSTIFICATION_PROVIDED: (justification: string) =>
    `In the ${PICK_UP} event, the "${DRIVER_IDENTIFIER}" was not provided, but a "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}" was declared: ${justification}.`,
  MISSING_JUSTIFICATION: (vehicleType: string) =>
    `In the ${PICK_UP} event, the vehicle "${vehicleType}" requires either a "${DRIVER_IDENTIFIER}" or an "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}".`,
  SLUDGE_PIPES: `In the ${PICK_UP} event, the "${VEHICLE_TYPE}" is "${SLUDGE_PIPES}", so driver identification is not required.`,
} as const;

interface RuleSubject {
  driverIdentifier: MethodologyDocumentEventAttributeValue | undefined;
  driverIdentifierExemptionJustification:
    | MethodologyDocumentEventAttributeValue
    | undefined;
  vehicleType: MethodologyDocumentEventAttributeValue | undefined;
}

export class DriverIdentificationProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    driverIdentifier,
    driverIdentifierExemptionJustification,
    vehicleType,
  }: RuleSubject): EvaluateResultOutput {
    const hasDriverId = isNonEmptyString(driverIdentifier);
    const hasJustification = isNonEmptyString(
      driverIdentifierExemptionJustification,
    );
    const vehicleTypeString = getOrDefault(vehicleType?.toString(), '');

    if (vehicleType === SLUDGE_PIPES) {
      return {
        resultComment: RESULT_COMMENTS.SLUDGE_PIPES,
        resultStatus: RuleOutputStatus.PASSED,
      };
    }

    if (hasDriverId && hasJustification) {
      return {
        resultComment: RESULT_COMMENTS.DRIVER_AND_JUSTIFICATION_PROVIDED,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (!hasDriverId && !hasJustification) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_JUSTIFICATION(vehicleTypeString),
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (hasJustification) {
      return {
        resultComment: RESULT_COMMENTS.JUSTIFICATION_PROVIDED(
          String(driverIdentifierExemptionJustification),
        ),
        resultStatus: RuleOutputStatus.PASSED,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.DRIVER_IDENTIFIER,
      resultStatus: RuleOutputStatus.PASSED,
    };
  }

  protected override getRuleSubject(document: Document): RuleSubject {
    const pickUpEvent = document.externalEvents?.find((event) =>
      eventHasName(event, PICK_UP),
    );

    return {
      driverIdentifier: getEventAttributeValue(pickUpEvent, DRIVER_IDENTIFIER),
      driverIdentifierExemptionJustification: getEventAttributeValue(
        pickUpEvent,
        DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
      ),
      vehicleType: getEventAttributeValue(pickUpEvent, VEHICLE_TYPE),
    };
  }
}
