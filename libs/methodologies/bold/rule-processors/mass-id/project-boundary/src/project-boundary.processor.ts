import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { calculateDistance, isNil } from '@carrot-fndn/shared/helpers';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type BoldDocument,
  type BoldDocumentEvent,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { convertDistance } from 'geolib';

import { RESULT_COMMENTS } from './project-boundary.constants';

const { DROP_OFF, PICK_UP } = DocumentEventName;

interface RuleSubject {
  dropOffEvent: BoldDocumentEvent | undefined;
  pickUpEvent: BoldDocumentEvent | undefined;
}

export class ProjectBoundaryProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected override evaluateResult({
    dropOffEvent,
    pickUpEvent,
  }: RuleSubject): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    if (isNil(pickUpEvent)) {
      return {
        resultComment: RESULT_COMMENTS.failed.MISSING_PICK_UP_EVENT,
        resultStatus: 'FAILED',
      };
    }

    if (isNil(dropOffEvent)) {
      return {
        resultComment: RESULT_COMMENTS.failed.MISSING_DROP_OFF_EVENT,
        resultStatus: 'FAILED',
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
        resultComment: RESULT_COMMENTS.passed.SUCCESS(distance),
        resultContent: {
          distance,
        },
        resultStatus: 'PASSED',
      };
    } catch {
      return {
        resultComment: RESULT_COMMENTS.failed.DISTANCE_CALCULATION_FAILED,
        resultStatus: 'FAILED',
      };
    }
  }

  protected override getRuleSubject(document: BoldDocument): RuleSubject {
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
