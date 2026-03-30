import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  getOrUndefined,
  isNil,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  and,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import {
  DocumentEventLabel,
  DocumentStatus,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';

import { RESULT_COMMENTS } from './waste-mass-is-unique.constants';
import { WasteMassIsUniqueProcessorErrors } from './waste-mass-is-unique.errors';
import {
  createAuditApiService,
  type EventsData,
  fetchSimilarMassIDDocuments,
} from './waste-mass-is-unique.helpers';

const { ACTOR, DROP_OFF, PICK_UP } = DocumentEventName;
const { RECYCLER, WASTE_GENERATOR } = DocumentEventLabel;
const { VEHICLE_LICENSE_PLATE } = DocumentEventAttributeName;

interface RuleSubject {
  cancelledCount: number;
  totalDuplicates: number;
  validDuplicatesCount: number;
}

export class WasteMassIsUniqueProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected readonly errorProcessor = new WasteMassIsUniqueProcessorErrors();

  override async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const document = await this.loadDocument(ruleInput);

      if (isNil(document)) {
        return mapToRuleOutput(ruleInput, 'FAILED', {
          resultComment: this.errorProcessor.getResultCommentFromError(
            this.errorProcessor.getKnownError(
              this.errorProcessor.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
            ),
          ),
        });
      }

      const ruleSubject = await this.getRuleSubject(document);

      const { resultComment, resultStatus } = this.evaluateResult(ruleSubject);

      return mapToRuleOutput(ruleInput, resultStatus, {
        resultComment: getOrUndefined(resultComment),
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, 'FAILED', {
        resultComment: this.errorProcessor.getResultCommentFromError(error),
      });
    }
  }

  protected evaluateResult({
    cancelledCount,
    totalDuplicates,
    validDuplicatesCount,
  }: RuleSubject): EvaluateResultOutput {
    if (validDuplicatesCount > 1) {
      return {
        resultComment: RESULT_COMMENTS.failed.VALID_DUPLICATE_FOUND(
          totalDuplicates,
          validDuplicatesCount,
        ),
        resultStatus: 'FAILED',
      };
    }

    if (cancelledCount > 0) {
      return {
        resultComment: RESULT_COMMENTS.passed.ONLY_CANCELLED_DUPLICATES(
          totalDuplicates,
          cancelledCount,
        ),
        resultStatus: 'PASSED',
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.NO_DUPLICATES_FOUND,
      resultStatus: 'PASSED',
    };
  }

  protected async getRuleSubject(document: Document): Promise<RuleSubject> {
    const eventsData = this.collectRequiredEventsData(document);

    const duplicateDocuments = await fetchSimilarMassIDDocuments({
      auditApiService: createAuditApiService(),
      document,
      eventsData,
    });

    const cancelledCount = duplicateDocuments.filter(
      (duplicateDocument) =>
        duplicateDocument.status === DocumentStatus.CANCELLED.toString(),
    ).length;

    return {
      cancelledCount,
      totalDuplicates: duplicateDocuments.length,
      validDuplicatesCount: duplicateDocuments.length - cancelledCount,
    };
  }

  private collectRequiredEventsData(document: Document): EventsData {
    const dropOffEvent = this.getEventOrThrow(
      document,
      { name: [DROP_OFF] },
      'MISSING_DROP_OFF_EVENT',
    );

    const pickUpEvent = this.getEventOrThrow(
      document,
      { name: [PICK_UP] },
      'MISSING_PICK_UP_EVENT',
    );

    const recyclerEvent = this.getEventOrThrow(
      document,
      { label: [RECYCLER], name: [ACTOR] },
      'MISSING_RECYCLER_EVENT',
    );

    const wasteGeneratorEvent = this.getEventOrThrow(
      document,
      { label: [WASTE_GENERATOR], name: [ACTOR] },
      'MISSING_WASTE_GENERATOR_EVENT',
    );

    const vehicleLicensePlate = this.getVehicleLicensePlate(pickUpEvent);

    return {
      dropOffEvent,
      pickUpEvent,
      recyclerEvent,
      vehicleLicensePlate,
      wasteGeneratorEvent,
    };
  }

  private getEventOrThrow(
    document: Document,
    criteria: {
      label?: DocumentEventLabel[];
      name: DocumentEventName[];
    },
    errorMessage: keyof WasteMassIsUniqueProcessorErrors['ERROR_MESSAGE'],
  ): DocumentEvent {
    const { label, name } = criteria;

    const nameFilter = eventNameIsAnyOf(name);
    const labelFilter = label ? eventLabelIsAnyOf(label) : null;

    const event = document.externalEvents?.find(
      labelFilter ? and(nameFilter, labelFilter) : nameFilter,
    );

    if (isNil(event)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE[errorMessage],
      );
    }

    return event;
  }

  private getVehicleLicensePlate(pickUpEvent: DocumentEvent): NonEmptyString {
    const vehicleLicensePlate = getEventAttributeValue(
      pickUpEvent,
      VEHICLE_LICENSE_PLATE,
    );

    if (!isNonEmptyString(vehicleLicensePlate)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_VEHICLE_LICENSE_PLATE,
      );
    }

    return vehicleLicensePlate;
  }
}
