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
  DocumentCategory,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  MethodologyDocumentEventLabel,
  MethodologyDocumentStatus,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';

import { UniquenessCheckProcessorErrors } from './uniqueness-check.errors';
import {
  createAuditApiService,
  type EventsData,
  fetchSimilarMassIdDocuments,
} from './uniqueness-check.helpers';

const { ACTOR, DROP_OFF, PICK_UP } = DocumentEventName;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;
const { VEHICLE_LICENSE_PLATE } = DocumentEventAttributeName;
const { MASS_ID } = DocumentCategory;

export const RESULT_COMMENTS = {
  NO_DUPLICATES_FOUND: `No other ${MASS_ID}s with the same attributes were found.`,
  ONLY_CANCELLED_DUPLICATES: (
    totalDuplicates: number,
    cancelledCount: number,
  ) =>
    `${totalDuplicates} similar ${MASS_ID}s were found, but all are cancelled (${cancelledCount}).`,
  VALID_DUPLICATE_FOUND: (
    totalDuplicates: number,
    validDuplicatesCount: number,
  ) =>
    `${totalDuplicates} similar ${MASS_ID}s were found, of which ${validDuplicatesCount} are not cancelled.`,
} as const;

interface RuleSubject {
  cancelledCount: number;
  totalDuplicates: number;
  validDuplicatesCount: number;
}

export class UniquenessCheckProcessor extends ParentDocumentRuleProcessor<RuleSubject> {
  protected readonly errorProcessor = new UniquenessCheckProcessorErrors();

  override async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const document = await this.loadDocument(ruleInput);

      if (isNil(document)) {
        return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
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
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
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
        resultComment: RESULT_COMMENTS.VALID_DUPLICATE_FOUND(
          totalDuplicates,
          validDuplicatesCount,
        ),
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (cancelledCount > 0) {
      return {
        resultComment: RESULT_COMMENTS.ONLY_CANCELLED_DUPLICATES(
          totalDuplicates,
          cancelledCount,
        ),
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.NO_DUPLICATES_FOUND,
      resultStatus: RuleOutputStatus.APPROVED,
    };
  }

  protected async getRuleSubject(document: Document): Promise<RuleSubject> {
    const eventsData = this.collectRequiredEventsData(document);

    const duplicateDocuments = await fetchSimilarMassIdDocuments({
      auditApiService: createAuditApiService(),
      document,
      eventsData,
    });

    const cancelledCount = duplicateDocuments.filter(
      (duplicateDocument) =>
        duplicateDocument.status ===
        MethodologyDocumentStatus.CANCELLED.toString(),
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
      label?: MethodologyDocumentEventLabel[];
      name: DocumentEventName[];
    },
    errorMessage: keyof UniquenessCheckProcessorErrors['ERROR_MESSAGE'],
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

    if (isNonEmptyString(vehicleLicensePlate)) {
      return vehicleLicensePlate;
    }

    throw this.errorProcessor.getKnownError(
      this.errorProcessor.ERROR_MESSAGE.MISSING_VEHICLE_LICENSE_PLATE,
    );
  }
}
