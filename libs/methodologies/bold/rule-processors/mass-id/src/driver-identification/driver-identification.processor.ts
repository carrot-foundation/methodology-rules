import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventHasName } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  DocumentEventName,
  DocumentEventVehicleType,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

const {
  DRIVER_IDENTIFIER,
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
  VEHICLE_TYPE,
} = NewDocumentEventAttributeName;
const { PICK_UP } = DocumentEventName;
const { SLUDGE_PIPES } = DocumentEventVehicleType;

export const RESULT_COMMENTS = {
  DRIVER_AND_JUSTIFICATION_PROVIDED: `Both the "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}" and "${DRIVER_IDENTIFIER}" were provided, but only one is allowed.`,
  DRIVER_IDENTIFIER: `The "${DRIVER_IDENTIFIER}" was provided.`,
  JUSTIFICATION_PROVIDED: (justification: string) =>
    `The "${DRIVER_IDENTIFIER}" was not provided, but a "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}" was declared: ${justification}.`,
  MISSING_JUSTIFICATION: (vehicleType: string) =>
    `The vehicle “${vehicleType}” requires either a "${DRIVER_IDENTIFIER}" or an "${DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION}".`,
  SLUDGE_PIPES: `The "${VEHICLE_TYPE}" is "${SLUDGE_PIPES}", so driver identification is not required.`,
} as const;

interface RuleSubject {
  driverIdentifier: MethodologyDocumentEventAttributeValue | undefined;
  driverIdentifierExemptionJustification:
    | MethodologyDocumentEventAttributeValue
    | string
    | undefined;
  vehicleType: MethodologyDocumentEventAttributeValue | string | undefined;
}

export class DriverIdentificationProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    driverIdentifier,
    driverIdentifierExemptionJustification,
    vehicleType,
  }: RuleSubject): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    if (vehicleType === SLUDGE_PIPES) {
      return {
        resultComment: RESULT_COMMENTS.SLUDGE_PIPES,
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    if (
      isNil(driverIdentifier) &&
      isNil(driverIdentifierExemptionJustification)
    ) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_JUSTIFICATION(
          vehicleType?.toString() ?? '',
        ),
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (isNil(driverIdentifier)) {
      return {
        resultComment: RESULT_COMMENTS.JUSTIFICATION_PROVIDED(
          driverIdentifierExemptionJustification?.toString() ?? '',
        ),
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.DRIVER_IDENTIFIER,
      resultStatus: RuleOutputStatus.APPROVED,
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
