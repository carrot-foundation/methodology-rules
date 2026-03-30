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
  type BoldDocument,
  DocumentEventAttributeName,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { type DocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import {
  RESULT_COMMENTS,
  SORTING_TOLERANCE,
} from './mass-id-sorting.constants';
import { MassIDSortingProcessorErrors } from './mass-id-sorting.errors';
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

const { DEDUCTED_WEIGHT, GROSS_WEIGHT } = DocumentEventAttributeName;

interface DocumentPair {
  massIDDocument: BoldDocument;
  recyclerAccreditationDocument: BoldDocument;
}

interface SortingData {
  calculatedSortingValue: number;
  deductedWeight: number;
  documentCurrentValue: number;
  grossWeight: number;
  sortingDescription: DocumentEventAttributeValue | string | undefined;
  sortingFactor: number;
  sortingValueCalculationDifference: number;
  valueAfterSorting: number;
  valueBeforeSorting: number;
}

export class MassIDSortingProcessor extends RuleDataProcessor {
  protected readonly processorErrors = new MassIDSortingProcessorErrors();

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
      return mapToRuleOutput(ruleInput, 'FAILED', {
        resultComment: this.processorErrors.getResultCommentFromError(error),
      });
    }
  }

  protected evaluateResult(sortingData: SortingData): EvaluateResultOutput {
    if (!isNonEmptyString(sortingData.sortingDescription)) {
      return {
        resultComment: RESULT_COMMENTS.failed.MISSING_SORTING_DESCRIPTION,
        resultStatus: 'FAILED',
      };
    }

    const expectedDeducted =
      sortingData.grossWeight * Number(sortingData.sortingFactor);
    const deductedDiff = Math.abs(
      sortingData.deductedWeight - expectedDeducted,
    );

    if (deductedDiff > SORTING_TOLERANCE) {
      return {
        resultComment: RESULT_COMMENTS.failed.DEDUCTED_WEIGHT_MISMATCH(
          sortingData.deductedWeight,
          Number(expectedDeducted.toFixed(3)),
        ),
        resultStatus: 'FAILED',
      };
    }

    const grossMatchesPrevious =
      sortingData.grossWeight === sortingData.valueBeforeSorting;

    if (!grossMatchesPrevious) {
      return {
        resultComment: RESULT_COMMENTS.failed.GROSS_WEIGHT_MISMATCH(
          sortingData.grossWeight,
          sortingData.valueBeforeSorting,
        ),
        resultStatus: 'FAILED',
      };
    }

    const documentValueMatchesSorting =
      sortingData.documentCurrentValue === sortingData.valueAfterSorting;

    if (!documentValueMatchesSorting) {
      return {
        resultComment: RESULT_COMMENTS.failed.DOCUMENT_VALUE_MISMATCH(
          sortingData.documentCurrentValue,
          sortingData.valueAfterSorting,
        ),
        resultStatus: 'FAILED',
      };
    }

    if (sortingData.sortingValueCalculationDifference > SORTING_TOLERANCE) {
      return {
        resultComment: RESULT_COMMENTS.failed.SORTING_VALUE_EXCEEDS_TOLERANCE(
          sortingData.sortingValueCalculationDifference,
        ),
        resultStatus: 'FAILED',
      };
    }

    return {
      resultComment: RESULT_COMMENTS.passed.SORTING_VALUE_WITHIN_TOLERANCE(
        sortingData.sortingValueCalculationDifference,
      ),
      resultStatus: 'PASSED',
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
    documentQuery: DocumentQuery<BoldDocument> | undefined,
  ): Promise<DocumentPair> {
    let recyclerAccreditationDocument: BoldDocument | undefined;
    let massIDDocument: BoldDocument | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (
        PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation) &&
        documentRelation.subtype === DocumentSubtype.RECYCLER
      ) {
        recyclerAccreditationDocument = document;
      }

      if (MASS_ID.matches(documentRelation)) {
        massIDDocument = document;
      }
    });

    this.validateOrThrow(
      isNil(recyclerAccreditationDocument),
      this.processorErrors.ERROR_MESSAGE
        .MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
    );

    this.validateOrThrow(
      isNil(massIDDocument),
      this.processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    );

    return {
      massIDDocument: massIDDocument!,
      recyclerAccreditationDocument: recyclerAccreditationDocument!,
    };
  }

  private extractSortingData(documents: DocumentPair): SortingData {
    const { massIDDocument, recyclerAccreditationDocument } = documents;

    const externalEvents = this.unwrapOrThrow(
      getValidatedExternalEvents(massIDDocument),
      this.processorErrors.ERROR_MESSAGE.MISSING_EXTERNAL_EVENTS,
    );

    const { priorEventWithValue, sortingEvent } = this.unwrapOrThrow(
      findSortingEvents(externalEvents),
      this.processorErrors.ERROR_MESSAGE.MISSING_SORTING_EVENT,
    );

    const sortingFactor = this.unwrapOrThrow(
      getSortingFactor(recyclerAccreditationDocument, massIDDocument),
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
      documentCurrentValue: massIDDocument.currentValue,
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
