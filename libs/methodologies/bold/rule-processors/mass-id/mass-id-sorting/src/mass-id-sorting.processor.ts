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
import {
  MASS_ID,
  PARTICIPANT_ACCREDITATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { type MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import { MassIdSortingProcessorErrors } from './mass-id-sorting.errors';
import {
  calculateSortingValues,
  findSortingEvents,
  getSortingDescription,
  getSortingFactor,
  getValidatedEventValues,
  getValidatedExternalEvents,
  getValidatedWeightAttributes,
  isValidationError,
  type ValidationError,
  ValidationErrorCode,
} from './mass-id-sorting.helpers';

const { DEDUCTED_WEIGHT, DESCRIPTION, GROSS_WEIGHT, SORTING_FACTOR } =
  DocumentEventAttributeName;

export const SORTING_TOLERANCE = 0.1;

export const RESULT_COMMENTS = {
  DEDUCTED_WEIGHT_MISMATCH: (deducted: number, expected: number) =>
    `The "${DEDUCTED_WEIGHT}" (${deducted} kg) must equal ${GROSS_WEIGHT} × (1 - ${SORTING_FACTOR}) (${expected} kg) within ${SORTING_TOLERANCE} kg.`,
  FAILED: (sortingValueCalculationDifference: number) =>
    `The calculated sorting value differs from the actual value by ${sortingValueCalculationDifference} kg, exceeding the allowed tolerance of ${SORTING_TOLERANCE} kg.`,
  GROSS_WEIGHT_MISMATCH: (gross: number, before: number) =>
    `The "${GROSS_WEIGHT}" (${gross} kg) must match the previous event value (${before} kg) within ${SORTING_TOLERANCE} kg.`,
  MISSING_SORTING_DESCRIPTION: `The "${DESCRIPTION}" must be provided.`,
  PASSED: (sortingValueCalculationDifference: number) =>
    `The calculated sorting value is within the allowed tolerance of ${SORTING_TOLERANCE}kg. The difference is ${sortingValueCalculationDifference} kg.`,
} as const;

interface DocumentPair {
  massIdDocument: Document;
  recyclerAccreditationDocument: Document;
}

interface SortingData {
  calculatedSortingValue: number;
  deductedWeight: number;
  grossWeight: number;
  sortingDescription:
    | MethodologyDocumentEventAttributeValue
    | string
    | undefined;
  sortingFactor: number;
  sortingValueCalculationDifference: number;
  valueAfterSorting: number;
  valueBeforeSorting: number;
}

export class MassIdSortingProcessor extends RuleDataProcessor {
  protected readonly processorErrors = new MassIdSortingProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentsQuery = await this.generateDocumentQuery(ruleInput);
      const documents = await this.collectDocuments(documentsQuery);

      const sortingData = this.extractSortingData(documents);

      const { resultComment, resultStatus } = this.evaluateResult(sortingData);

      return mapToRuleOutput(ruleInput, resultStatus, {
        resultComment: getOrUndefined(resultComment),
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.FAILED, {
        resultComment: this.processorErrors.getResultCommentFromError(error),
      });
    }
  }

  protected evaluateResult(sortingData: SortingData): EvaluateResultOutput {
    if (!isNonEmptyString(sortingData.sortingDescription)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_SORTING_DESCRIPTION,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    const expectedDeducted =
      sortingData.grossWeight * (1 - Number(sortingData.sortingFactor));
    const deductedDiff = Math.abs(
      sortingData.deductedWeight - expectedDeducted,
    );

    if (deductedDiff > SORTING_TOLERANCE) {
      return {
        resultComment: RESULT_COMMENTS.DEDUCTED_WEIGHT_MISMATCH(
          sortingData.deductedWeight,
          Number(expectedDeducted.toFixed(3)),
        ),
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    const grossMatchesPrevious =
      sortingData.grossWeight === sortingData.valueBeforeSorting;

    if (!grossMatchesPrevious) {
      return {
        resultComment: RESULT_COMMENTS.GROSS_WEIGHT_MISMATCH(
          sortingData.grossWeight,
          sortingData.valueBeforeSorting,
        ),
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (sortingData.sortingValueCalculationDifference > SORTING_TOLERANCE) {
      return {
        resultComment: RESULT_COMMENTS.FAILED(
          sortingData.sortingValueCalculationDifference,
        ),
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    return {
      resultComment: RESULT_COMMENTS.PASSED(
        sortingData.sortingValueCalculationDifference,
      ),
      resultStatus: RuleOutputStatus.PASSED,
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
        relatedDocuments: [PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.match],
      },
      documentId: ruleInput.documentId,
    });
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<DocumentPair> {
    let recyclerAccreditationDocument: Document | undefined;
    let massIdDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (
        PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation) &&
        documentRelation.subtype === DocumentSubtype.RECYCLER
      ) {
        recyclerAccreditationDocument = document;
      }

      if (MASS_ID.matches(documentRelation)) {
        massIdDocument = document;
      }
    });

    this.validateOrThrow(
      isNil(recyclerAccreditationDocument),
      this.processorErrors.ERROR_MESSAGE
        .MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
    );

    this.validateOrThrow(
      isNil(massIdDocument),
      this.processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    );

    return {
      massIdDocument: massIdDocument!,
      recyclerAccreditationDocument: recyclerAccreditationDocument!,
    };
  }

  private extractSortingData(documents: DocumentPair): SortingData {
    const { massIdDocument, recyclerAccreditationDocument } = documents;

    const externalEvents = this.unwrapOrThrow(
      getValidatedExternalEvents(massIdDocument),
      this.processorErrors.ERROR_MESSAGE.MISSING_EXTERNAL_EVENTS,
    );

    const { priorEventWithValue, sortingEvent } = this.unwrapOrThrow(
      findSortingEvents(externalEvents),
      this.processorErrors.ERROR_MESSAGE.MISSING_SORTING_EVENT,
    );

    const sortingFactor = this.unwrapOrThrow(
      getSortingFactor(recyclerAccreditationDocument, massIdDocument),
      this.processorErrors.ERROR_MESSAGE.MISSING_SORTING_FACTOR,
    );

    const eventValues = this.unwrapOrThrow(
      getValidatedEventValues(priorEventWithValue, sortingEvent),
      (error: ValidationError) => {
        if (
          error.code === ValidationErrorCode.EVENT_BEFORE_SORTING_UNDEFINED ||
          error.code === ValidationErrorCode.INVALID_VALUE_BEFORE_SORTING
        ) {
          return this.processorErrors.ERROR_MESSAGE.INVALID_VALUE_BEFORE_SORTING(
            priorEventWithValue?.value,
          );
        }

        return this.processorErrors.ERROR_MESSAGE.INVALID_VALUE_AFTER_SORTING(
          sortingEvent.value,
        );
      },
    );

    const weightAttributes = this.unwrapOrThrow(
      getValidatedWeightAttributes(sortingEvent),
      (error: ValidationError) => {
        if (error.code === ValidationErrorCode.INVALID_DEDUCTED_WEIGHT_FORMAT) {
          return this.processorErrors.ERROR_MESSAGE
            .INVALID_DEDUCTED_WEIGHT_FORMAT;
        }

        if (error.code === ValidationErrorCode.INVALID_GROSS_WEIGHT) {
          return this.processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT(
            getEventAttributeValue(sortingEvent, GROSS_WEIGHT),
          );
        }

        if (error.code === ValidationErrorCode.INVALID_GROSS_WEIGHT_FORMAT) {
          return this.processorErrors.ERROR_MESSAGE.INVALID_GROSS_WEIGHT_FORMAT;
        }

        if (error.code === ValidationErrorCode.INVALID_WEIGHT_COMPARISON) {
          const grossWeight = getEventAttributeValue(
            sortingEvent,
            GROSS_WEIGHT,
          ) as number;

          const deductedWeight = getEventAttributeValue(
            sortingEvent,
            DEDUCTED_WEIGHT,
          ) as number;

          return this.processorErrors.ERROR_MESSAGE.INVALID_WEIGHT_COMPARISON(
            deductedWeight,
            grossWeight,
          );
        }

        return this.processorErrors.ERROR_MESSAGE.INVALID_DEDUCTED_WEIGHT(
          getEventAttributeValue(sortingEvent, DEDUCTED_WEIGHT),
        );
      },
    );

    const sortingDescription = getSortingDescription(sortingEvent);
    const calculations = calculateSortingValues(
      weightAttributes,
      eventValues.valueAfterSorting,
    );

    return {
      ...calculations,
      sortingDescription,
      sortingFactor,
      valueAfterSorting: eventValues.valueAfterSorting,
      valueBeforeSorting: eventValues.valueBeforeSorting,
    };
  }

  private unwrapOrThrow<T>(
    result: T | ValidationError,
    errorMessage: ((error: ValidationError) => string) | string,
  ): T {
    if (isValidationError(result)) {
      const message =
        typeof errorMessage === 'string' ? errorMessage : errorMessage(result);

      throw this.processorErrors.getKnownError(message);
    }

    return result;
  }

  private validateOrThrow(condition: boolean, errorMessage: string): void {
    if (condition) {
      throw this.processorErrors.getKnownError(errorMessage);
    }
  }
}
