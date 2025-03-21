import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { calculateDistance, isNil } from '@carrot-fndn/shared/helpers';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';
import { convertDistance } from 'geolib';

const { DROP_OFF, PICK_UP } = DocumentEventName;

export const RESULT_COMMENTS = {
  DISTANCE_CALCULATION_FAILED: `Unable to calculate the distance between the first "${PICK_UP}" and last "${DROP_OFF}".`,
  MISSING_DROP_OFF_EVENT: `No "${DROP_OFF}" event was found in the document.`,
  MISSING_PICK_UP_EVENT: `No "${PICK_UP}" event was found in the document.`,
  SUCCESS: (distance: number) =>
    `The distance between the first "${PICK_UP}" and last "${DROP_OFF}" is ${distance}km.`,
} as const;

interface RuleSubject {
  dropOffEvent: DocumentEvent | undefined;
  pickUpEvent: DocumentEvent | undefined;
}

export class ProjectBoundaryProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    dropOffEvent,
    pickUpEvent,
  }: RuleSubject): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    if (isNil(pickUpEvent)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_PICK_UP_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (isNil(dropOffEvent)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_DROP_OFF_EVENT,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    try {
      const distanceInMeters = calculateDistance(
        dropOffEvent.address,
        pickUpEvent.address,
      );

      const distance =
        Math.round(convertDistance(distanceInMeters, 'km') * 1000) / 1000;

      return {
        resultComment: RESULT_COMMENTS.SUCCESS(distance),
        resultContent: {
          distance,
        },
        resultStatus: RuleOutputStatus.APPROVED,
      };
    } catch {
      return {
        resultComment: RESULT_COMMENTS.DISTANCE_CALCULATION_FAILED,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }
  }

  protected override getRuleSubject(document: Document): RuleSubject {
    const pickUpEvent = document.externalEvents?.find(
      eventNameIsAnyOf([PICK_UP]),
    );

    const dropOffEvent = document.externalEvents
      ?.filter(eventNameIsAnyOf([DROP_OFF]))
      .at(-1);

    return {
      dropOffEvent,
      pickUpEvent,
    };
  }
}
