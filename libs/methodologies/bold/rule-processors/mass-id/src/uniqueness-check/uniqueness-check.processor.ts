import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { MASS_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  and,
  eventLabelIsAnyOf,
  eventNameIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentStatus,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  MethodologyDocumentEventLabel,
  type NonEmptyString,
} from '@carrot-fndn/shared/types';

import { UniquenessCheckProcessorErrors } from './uniqueness-check.errors';
import {
  type EventsData,
  createAuditApiService,
  fetchSimilarMassIdDocuments,
} from './uniqueness-check.helpers';

const { ACTOR, DROP_OFF, PICK_UP } = DocumentEventName;
const { RECYCLER, WASTE_GENERATOR } = MethodologyDocumentEventLabel;
const { VEHICLE_LICENSE_PLATE: VEHICLE_LICENSE_PLATE_V1 } =
  DocumentEventAttributeName;
const { VEHICLE_LICENSE_PLATE: VEHICLE_LICENSE_PLATE_V2 } =
  NewDocumentEventAttributeName;

export const RESULT_COMMENTS = {
  NO_DUPLICATES_FOUND:
    'No other documents with the same attributes were found.',
  ONLY_CANCELLED_DUPLICATES: (
    totalDuplicates: number,
    cancelledCount: number,
  ) =>
    `${totalDuplicates} similar documents were found, but all are cancelled (${cancelledCount}).`,
  VALID_DUPLICATE_FOUND: (
    totalDuplicates: number,
    validDuplicatesCount: number,
  ) =>
    `${totalDuplicates} similar documents were found, of which ${validDuplicatesCount} are not cancelled.`,
} as const;

interface RuleSubject {
  cancelledCount: number;
  totalDuplicates: number;
  validDuplicatesCount: number;
}

export class UniquenessCheckProcessor extends RuleDataProcessor {
  protected readonly errorProcessor = new UniquenessCheckProcessorErrors();

  private getDropOffEvent(document: Document): DocumentEvent {
    const dropOffEvent = document.externalEvents?.find(
      eventNameIsAnyOf([DROP_OFF]),
    );

    if (isNil(dropOffEvent)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_DROP_OFF_EVENT,
      );
    }

    return dropOffEvent;
  }

  private async getMassIdDocument(
    documentQuery: DocumentQuery<Document>,
  ): Promise<Document> {
    let massIdDocument: Document | undefined;

    await documentQuery.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (MASS_ID.matches(documentReference)) {
        massIdDocument = document;
      }
    });

    if (isNil(massIdDocument)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MASS_DOCUMENT_NOT_FOUND,
      );
    }

    return massIdDocument;
  }

  private getPickUpEvent(document: Document): DocumentEvent {
    const pickUpEvent = document.externalEvents?.find(
      eventNameIsAnyOf([PICK_UP]),
    );

    if (isNil(pickUpEvent)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_PICK_UP_EVENT,
      );
    }

    return pickUpEvent;
  }

  private getRecyclerEvent(document: Document): DocumentEvent {
    const recyclerEvent = document.externalEvents?.find(
      and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([RECYCLER])),
    );

    if (isNil(recyclerEvent)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_RECYCLER_EVENT,
      );
    }

    return recyclerEvent;
  }

  private getVehicleLicensePlate(pickUpEvent: DocumentEvent): NonEmptyString {
    const vehicleLicensePlateV1 = getEventAttributeValue(
      pickUpEvent,
      VEHICLE_LICENSE_PLATE_V1,
    );

    if (isNonEmptyString(vehicleLicensePlateV1)) {
      return vehicleLicensePlateV1;
    }

    const vehicleLicensePlateV2 = getEventAttributeValue(
      pickUpEvent,
      VEHICLE_LICENSE_PLATE_V2,
    );

    if (isNonEmptyString(vehicleLicensePlateV2)) {
      return vehicleLicensePlateV2;
    }

    throw this.errorProcessor.getKnownError(
      this.errorProcessor.ERROR_MESSAGE.MISSING_VEHICLE_LICENSE_PLATE,
    );
  }

  private getWasteGeneratorEvent(document: Document): DocumentEvent {
    const wasteGeneratorEvent = document.externalEvents?.find(
      and(eventNameIsAnyOf([ACTOR]), eventLabelIsAnyOf([WASTE_GENERATOR])),
    );

    if (isNil(wasteGeneratorEvent)) {
      throw this.errorProcessor.getKnownError(
        this.errorProcessor.ERROR_MESSAGE.MISSING_WASTE_GENERATOR_EVENT,
      );
    }

    return wasteGeneratorEvent;
  }

  protected evaluateResult({
    cancelledCount,
    totalDuplicates,
    validDuplicatesCount,
  }: RuleSubject): EvaluateResultOutput {
    if (validDuplicatesCount > 0) {
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

  protected async generateDocumentQuery(ruleInput: RuleInput) {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    return documentQueryService.load({
      context: {
        s3KeyPrefix: ruleInput.documentKeyPrefix,
      },
      criteria: {
        parentDocument: {},
      },
      documentId: ruleInput.documentId,
    });
  }

  protected async getRuleSubject(document: Document): Promise<RuleSubject> {
    const eventsData: EventsData = {
      dropOffEvent: this.getDropOffEvent(document),
      pickUpEvent: this.getPickUpEvent(document),
      recyclerEvent: this.getRecyclerEvent(document),
      vehicleLicensePlate: this.getVehicleLicensePlate(
        this.getPickUpEvent(document),
      ),
      wasteGeneratorEvent: this.getWasteGeneratorEvent(document),
    };

    const duplicateDocuments = await fetchSimilarMassIdDocuments({
      auditApiService: createAuditApiService(),
      document,
      eventsData,
    });

    const cancelledCount = duplicateDocuments.filter(
      (duplicateDocument) =>
        duplicateDocument.status === DocumentStatus.CANCELLED,
    ).length;

    return {
      cancelledCount,
      totalDuplicates: duplicateDocuments.length,
      validDuplicatesCount: duplicateDocuments.length - cancelledCount,
    };
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentsQuery = await this.generateDocumentQuery(ruleInput);
      const massIdDocument = await this.getMassIdDocument(documentsQuery);
      const ruleSubject = await this.getRuleSubject(massIdDocument);

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
}
