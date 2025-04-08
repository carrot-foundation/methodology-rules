import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonEmptyArray,
  isNonEmptyString,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS_ID,
  PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventWeighingCaptureMethod,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import {
  APPROVED_RESULT_COMMENTS,
  INVALID_RESULT_COMMENTS,
  NOT_FOUND_RESULT_COMMENTS,
} from './weighing.constants';
import { WeighingProcessorErrors } from './weighing.errors';
import {
  type WeighingEventValues,
  getWeighingEventValues,
  getWeighingEvents,
  validateContainerCapacityAttribute,
  validateContainerQuantity,
  validateContainerType,
  validateDescription,
  validateGrossWeightAttribute,
  validateMassNetWeightAttribute,
  validateNetWeightCalculationDifference,
  validateScaleHomologationStatus,
  validateScaleType,
  validateTareAttribute,
  validateVehicleLicensePlateAttribute,
  validateWeighingCaptureMethod,
} from './weighing.helpers';

const {
  CONTAINER_CAPACITY,
  CONTAINER_TYPE,
  GROSS_WEIGHT,
  SCALE_TYPE,
  VEHICLE_LICENSE_PLATE,
  WEIGHING_CAPTURE_METHOD,
} = DocumentEventAttributeName;

interface RuleSubject {
  recyclerHomologationDocument: Document;
  weighingEvents: DocumentEvent[];
}

interface DocumentPair {
  massIdDocument: Document;
  recyclerHomologationDocument: Document;
}

export class WeighingProcessor extends RuleDataProcessor {
  protected readonly processorErrors = new WeighingProcessorErrors();

  private async collectDocuments(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<DocumentPair> {
    let recyclerHomologationDocument: Document | undefined;
    let massIdDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (
        PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.matches(documentReference) &&
        documentReference.subtype === DocumentSubtype.RECYCLER
      ) {
        recyclerHomologationDocument = document;
      }

      if (MASS_ID.matches(documentReference)) {
        massIdDocument = document;
      }
    });

    this.validateOrThrow(
      isNil(recyclerHomologationDocument),
      this.processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_HOMOLOGATION_DOCUMENT,
    );

    this.validateOrThrow(
      isNil(massIdDocument),
      this.processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    );

    return {
      massIdDocument: massIdDocument as Document,
      recyclerHomologationDocument: recyclerHomologationDocument as Document,
    };
  }

  private evaluateTwoStepWeighingEventValues(weighingEvents: DocumentEvent[]): {
    rejectedMessages: string[];
  } {
    const rejectedMessages: string[] = [];
    const firstWeighingEvent = weighingEvents[0];
    const secondWeighingEvent = weighingEvents[1];

    const twoStepWeighingErrors = [
      WEIGHING_CAPTURE_METHOD,
      SCALE_TYPE,
      CONTAINER_CAPACITY,
      CONTAINER_TYPE,
      GROSS_WEIGHT,
      VEHICLE_LICENSE_PLATE,
    ].map((attributeName) => {
      const firstWeighingEventValue = getEventAttributeValue(
        firstWeighingEvent,
        attributeName,
      );

      const secondWeighingEventValue = getEventAttributeValue(
        secondWeighingEvent,
        attributeName,
      );

      if (firstWeighingEventValue === secondWeighingEventValue) {
        return null;
      }

      return INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_VALUES({
        attributeName,
        firstValue: firstWeighingEventValue,
        secondValue: secondWeighingEventValue,
      });
    });

    if (
      firstWeighingEvent?.participant.id !== secondWeighingEvent?.participant.id
    ) {
      rejectedMessages.push(
        INVALID_RESULT_COMMENTS.TWO_STEP_WEIGHING_EVENT_PARTICIPANT_IDS,
      );
    }

    rejectedMessages.push(
      ...twoStepWeighingErrors.filter((error) => isNonEmptyString(error)),
    );

    return {
      rejectedMessages,
    };
  }

  private evaluateWeighingEventValues(
    weighingEventValues: WeighingEventValues,
    recyclerHomologationDocument: Document,
    isTwoStepWeighingEvent = false,
  ): {
    rejectedMessages: string[];
  } {
    const rejectedMessages: string[] = [];

    const scaleHomologationMessages = validateScaleHomologationStatus(
      weighingEventValues.scaleType,
      recyclerHomologationDocument,
    );

    rejectedMessages.push(...scaleHomologationMessages);

    const containerQuantityMessages = validateContainerQuantity(
      weighingEventValues.containerQuantity,
      weighingEventValues.vehicleType,
    );

    rejectedMessages.push(...containerQuantityMessages);

    const grossWeightMessages = validateGrossWeightAttribute(
      weighingEventValues.grossWeight,
    );

    rejectedMessages.push(...grossWeightMessages);

    const massNetWeightMessages = validateMassNetWeightAttribute(
      weighingEventValues.massNetWeight,
    );

    rejectedMessages.push(...massNetWeightMessages);

    const descriptionMessages = validateDescription(
      weighingEventValues.description,
    );

    rejectedMessages.push(...descriptionMessages);

    const tareMessages = validateTareAttribute(weighingEventValues.tare);

    rejectedMessages.push(...tareMessages);

    const containerTypeMessages = validateContainerType(
      weighingEventValues.containerType,
      isTwoStepWeighingEvent,
    );

    rejectedMessages.push(...containerTypeMessages);

    const scaleTypeMessages = validateScaleType(
      weighingEventValues.scaleType,
      isTwoStepWeighingEvent,
    );

    rejectedMessages.push(...scaleTypeMessages);

    const captureMethodMessages = validateWeighingCaptureMethod(
      weighingEventValues.weighingCaptureMethod,
    );

    rejectedMessages.push(...captureMethodMessages);

    const containerCapacityMessages = validateContainerCapacityAttribute(
      weighingEventValues.containerCapacityAttribute,
    );

    rejectedMessages.push(...containerCapacityMessages);

    const vehicleLicensePlateMessages = validateVehicleLicensePlateAttribute(
      weighingEventValues.vehicleLicensePlateAttribute,
    );

    rejectedMessages.push(...vehicleLicensePlateMessages);

    const netWeightCalculationMessages = validateNetWeightCalculationDifference(
      {
        containerQuantity: Number(weighingEventValues.containerQuantity),
        grossWeight: Number(weighingEventValues.grossWeight?.value),
        massNetWeight: Number(weighingEventValues.massNetWeight?.value),
        tare: Number(weighingEventValues.tare?.value),
      },
    );

    rejectedMessages.push(...netWeightCalculationMessages);

    return {
      rejectedMessages,
    };
  }

  private validateOrThrow(condition: boolean, errorMessage: string): void {
    if (condition) {
      throw this.processorErrors.getKnownError(errorMessage);
    }
  }

  private validateWeighingEvents(
    weighingEvents: DocumentEvent[] | undefined,
  ): EvaluateResultOutput | undefined {
    if (!isNonEmptyArray(weighingEvents)) {
      return {
        resultComment: NOT_FOUND_RESULT_COMMENTS.NO_WEIGHING_EVENTS,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (weighingEvents.length > 2) {
      return {
        resultComment: NOT_FOUND_RESULT_COMMENTS.MORE_THAN_TWO_WEIGHING_EVENTS,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    return undefined;
  }

  protected evaluateResult({
    recyclerHomologationDocument,
    weighingEvents,
  }: RuleSubject): EvaluateResultOutput {
    const weighingEventsResult = this.validateWeighingEvents(weighingEvents);

    if (weighingEventsResult) {
      return weighingEventsResult;
    }

    if (weighingEvents.length === 1) {
      const weighingEventValues = getWeighingEventValues(
        weighingEvents[0] as DocumentEvent,
      );

      const result = this.evaluateWeighingEventValues(
        weighingEventValues,
        recyclerHomologationDocument,
      );

      if (isNonEmptyArray(result.rejectedMessages)) {
        return {
          resultComment: result.rejectedMessages.join(' '),
          resultStatus: RuleOutputStatus.REJECTED,
        };
      }

      if (
        weighingEventValues.weighingCaptureMethod ===
        DocumentEventWeighingCaptureMethod.TRANSPORT_MANIFEST
      ) {
        return {
          resultComment: APPROVED_RESULT_COMMENTS.TRANSPORT_MANIFEST,
          resultStatus: RuleOutputStatus.APPROVED,
        };
      }

      return {
        resultComment: APPROVED_RESULT_COMMENTS.SINGLE_STEP,
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    const weighingEventResults: {
      rejectedMessages: string[];
    }[] = [];

    for (const weighingEvent of weighingEvents) {
      const weighingEventValues = getWeighingEventValues(weighingEvent);

      const result = this.evaluateWeighingEventValues(
        weighingEventValues,
        recyclerHomologationDocument,
        true,
      );

      if (isNonEmptyArray(result.rejectedMessages)) {
        weighingEventResults.push(result);
      }
    }

    const result = this.evaluateTwoStepWeighingEventValues(weighingEvents);

    if (
      isNonEmptyArray([...weighingEventResults, ...result.rejectedMessages])
    ) {
      return {
        resultComment: [
          ...weighingEventResults.flatMap(
            ({ rejectedMessages }) => rejectedMessages,
          ),
          ...result.rejectedMessages,
        ].join(' '),
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    return {
      resultComment: APPROVED_RESULT_COMMENTS.TWO_STEP,
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
        relatedDocuments: [PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.match],
      },
      documentId: ruleInput.documentId,
    });
  }

  protected getRuleSubject({
    massIdDocument,
    recyclerHomologationDocument,
  }: DocumentPair): RuleSubject {
    const weighingEvents = getWeighingEvents(massIdDocument);

    return {
      recyclerHomologationDocument,
      weighingEvents,
    };
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentsQuery = await this.generateDocumentQuery(ruleInput);
      const documents = await this.collectDocuments(documentsQuery);
      const ruleSubject = this.getRuleSubject(documents);

      const { resultComment, resultStatus } = this.evaluateResult(ruleSubject);

      return mapToRuleOutput(ruleInput, resultStatus, {
        resultComment: getOrUndefined(resultComment),
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.processorErrors.getResultCommentFromError(error),
      });
    }
  }
}
