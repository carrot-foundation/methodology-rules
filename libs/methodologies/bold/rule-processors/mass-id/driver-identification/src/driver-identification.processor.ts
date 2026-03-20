import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import {
  getOrDefault,
  isNil,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventHasName } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import { RESULT_COMMENTS } from './driver-identification.constants';

const {
  DRIVER_IDENTIFIER,
  DRIVER_IDENTIFIER_EXEMPTION_JUSTIFICATION,
  VEHICLE_TYPE,
} = DocumentEventAttributeName;
const { PICK_UP } = DocumentEventName;
const { SLUDGE_PIPES } = DocumentEventVehicleType;

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
    const hasDriverId = !isNil(driverIdentifier);
    const hasJustification = isNonEmptyString(
      driverIdentifierExemptionJustification,
    );
    const vehicleTypeString = getOrDefault(vehicleType?.toString(), '');

    if (vehicleType === SLUDGE_PIPES) {
      return {
        resultComment: RESULT_COMMENTS.passed.SLUDGE_PIPES,
        resultStatus: 'PASSED' as const,
      };
    }

    if (hasDriverId && hasJustification) {
      return {
        resultComment: RESULT_COMMENTS.failed.DRIVER_AND_JUSTIFICATION_PROVIDED,
        resultStatus: 'FAILED' as const,
      };
    }

    if (!hasDriverId && !hasJustification) {
      return {
        resultComment:
          RESULT_COMMENTS.failed.MISSING_JUSTIFICATION(vehicleTypeString),
        resultStatus: 'FAILED' as const,
      };
    }

    if (hasJustification) {
      return {
        resultComment: RESULT_COMMENTS.passed.JUSTIFICATION_PROVIDED(
          String(driverIdentifierExemptionJustification),
        ),
        resultStatus: 'PASSED' as const,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.DRIVER_IDENTIFIER,
      resultStatus: 'PASSED' as const,
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
