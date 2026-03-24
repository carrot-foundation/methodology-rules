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

    if (vehicleType === DocumentEventVehicleType['Sludge Pipes']) {
      return {
        resultComment: RESULT_COMMENTS.passed.SLUDGE_PIPES,
        resultStatus: 'PASSED',
      };
    }

    if (hasDriverId && hasJustification) {
      return {
        resultComment: RESULT_COMMENTS.failed.DRIVER_AND_JUSTIFICATION_PROVIDED,
        resultStatus: 'FAILED',
      };
    }

    if (!hasDriverId && !hasJustification) {
      return {
        resultComment:
          RESULT_COMMENTS.failed.MISSING_JUSTIFICATION(vehicleTypeString),
        resultStatus: 'FAILED',
      };
    }

    if (hasJustification) {
      return {
        resultComment: RESULT_COMMENTS.passed.JUSTIFICATION_PROVIDED(
          String(driverIdentifierExemptionJustification),
        ),
        resultStatus: 'PASSED',
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.DRIVER_IDENTIFIER,
      resultStatus: 'PASSED',
    };
  }

  protected override getRuleSubject(document: Document): RuleSubject {
    const pickUpEvent = document.externalEvents?.find((event) =>
      eventHasName(event, DocumentEventName['Pick-up']),
    );

    return {
      driverIdentifier: getEventAttributeValue(
        pickUpEvent,
        DocumentEventAttributeName['Driver Identifier'],
      ),
      driverIdentifierExemptionJustification: getEventAttributeValue(
        pickUpEvent,
        DocumentEventAttributeName['Driver Identifier Exemption Justification'],
      ),
      vehicleType: getEventAttributeValue(
        pickUpEvent,
        DocumentEventAttributeName['Vehicle Type'],
      ),
    };
  }
}
