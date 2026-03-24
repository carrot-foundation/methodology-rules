import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { getOrUndefined, isNil } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  and,
  eventHasMetadataAttribute,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventVehicleType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { MethodologyDocumentEventLabel } from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './hauler-identification.constants';

type Subject = {
  haulerEvent: DocumentEvent | undefined;
  pickUpEvent: DocumentEvent | undefined;
};

export const OPTIONAL_HAULER_VEHICLE_TYPES = [
  DocumentEventVehicleType['Sludge Pipes'],
  DocumentEventVehicleType.Cart,
] as const;

export class HaulerIdentificationProcessor extends ParentDocumentRuleProcessor<Subject> {
  protected override evaluateResult({
    haulerEvent,
    pickUpEvent,
  }: Subject): EvaluateResultOutput {
    if (isNil(pickUpEvent)) {
      return {
        resultComment: RESULT_COMMENTS.failed.PICK_UP_EVENT_MISSING,
        resultStatus: 'FAILED',
      };
    }

    if (!isNil(haulerEvent)) {
      return {
        resultComment: RESULT_COMMENTS.passed.HAULER_EVENT_FOUND,
        resultStatus: 'PASSED',
      };
    }

    const vehicleType = getEventAttributeValue(
      pickUpEvent,
      DocumentEventAttributeName['Vehicle Type'],
    );

    const isHaulerOptional = eventHasMetadataAttribute({
      event: pickUpEvent,
      metadataName: DocumentEventAttributeName['Vehicle Type'],
      metadataValues: OPTIONAL_HAULER_VEHICLE_TYPES,
    });

    if (isHaulerOptional) {
      return {
        resultComment: RESULT_COMMENTS.passed.HAULER_NOT_REQUIRED(
          vehicleType as string,
        ),
        resultStatus: 'PASSED',
      };
    }

    return {
      resultComment: RESULT_COMMENTS.failed.HAULER_EVENT_MISSING(
        vehicleType as string,
      ),
      resultStatus: 'FAILED',
    };
  }

  protected override getRuleSubject(document: Document): Subject | undefined {
    return {
      haulerEvent: getOrUndefined(
        document.externalEvents?.find(
          and(
            eventNameIsAnyOf([DocumentEventName.ACTOR]),
            eventLabelIsAnyOf([MethodologyDocumentEventLabel.Hauler]),
          ),
        ),
      ),
      pickUpEvent: getOrUndefined(
        document.externalEvents?.find(
          eventNameIsAnyOf([DocumentEventName['Pick-up']]),
        ),
      ),
    };
  }
}
