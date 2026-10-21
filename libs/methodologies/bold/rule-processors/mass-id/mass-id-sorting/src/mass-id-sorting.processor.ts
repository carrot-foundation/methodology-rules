import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonEmptyString,
  logger,
} from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
  PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS_ID,
  PARTICIPANT_ACCREDITATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  BoldAttributeName,
  type BoldDocument,
  BoldDocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  mapToRuleOutput,
  type RenderedRuleFinding,
} from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { type BoldAttributeValue } from '@carrot-fndn/shared/types';

import {
  RESULT_COMMENTS,
  SORTING_TOLERANCE,
} from './mass-id-sorting.constants';
import { MassIDSortingProcessorErrors } from './mass-id-sorting.errors';
import { MASS_ID_SORTING_FINDINGS } from './mass-id-sorting.findings';
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

const { DEDUCTED_WEIGHT, GROSS_WEIGHT } = BoldAttributeName;

interface DocumentPair {
  massIDDocument: BoldDocument;
  recyclerAccreditationDocument: BoldDocument;
}

interface SortingData {
  calculatedSortingValue: number;
  deductedWeight: number;
  documentCurrentValue: number;
  grossWeight: number;
  sortingDescription: BoldAttributeValue | string | undefined;
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

      const { resultComment, resultFindings, resultStatus } =
        this.evaluateResult(sortingData);

      return mapToRuleOutput(ruleInput, resultStatus, {
        resultComment: getOrUndefined(resultComment),
        resultFindings,
      });
    } catch (error: unknown) {
      logger.error(
        {
          documentId: ruleInput.documentId,
          err: error,
          operation: 'mass-id-sorting',
          ruleId: ruleInput.ruleName,
        },
        'Mass-id-sorting processor failed',
      );

      return mapToRuleOutput(
        ruleInput,
        'FAILED',
        this.processorErrors.getFailedResultFromError(error),
      );
    }
  }

  protected evaluateResult(sortingData: SortingData): EvaluateResultOutput {
    if (!isNonEmptyString(sortingData.sortingDescription)) {
      return {
        ...MASS_ID_SORTING_FINDINGS.result(
          'FAILED.MISSING_SORTING_DESCRIPTION',
        ),
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
        ...MASS_ID_SORTING_FINDINGS.result(
          'FAILED.DEDUCTED_WEIGHT_MISMATCH',
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
        ...MASS_ID_SORTING_FINDINGS.result(
          'FAILED.GROSS_WEIGHT_MISMATCH',
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
        ...MASS_ID_SORTING_FINDINGS.result(
          'FAILED.DOCUMENT_VALUE_MISMATCH',
          sortingData.documentCurrentValue,
          sortingData.valueAfterSorting,
        ),
        resultStatus: 'FAILED',
      };
    }

    if (sortingData.sortingValueCalculationDifference > SORTING_TOLERANCE) {
      return {
        ...MASS_ID_SORTING_FINDINGS.result(
          'FAILED.SORTING_VALUE_EXCEEDS_TOLERANCE',
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
      criteria: PARTICIPANT_ACCREDITATION_DOCUMENT_QUERY_CRITERIA,
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
        documentRelation.subtype === BoldDocumentSubtype.RECYCLER
      ) {
        recyclerAccreditationDocument = document;
      }

      if (MASS_ID.matches(documentRelation)) {
        massIDDocument = document;
      }
    });

    this.validateOrThrow(
      isNil(recyclerAccreditationDocument),
      MASS_ID_SORTING_FINDINGS.render(
        'ERROR.MISSING_RECYCLER_ACCREDITATION_DOCUMENT',
      ),
    );

    this.validateOrThrow(
      isNil(massIDDocument),
      MASS_ID_SORTING_FINDINGS.render('ERROR.MASS_ID_DOCUMENT_NOT_FOUND'),
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
      MASS_ID_SORTING_FINDINGS.render('ERROR.MISSING_EXTERNAL_EVENTS'),
    );

    const { priorEventWithValue, sortingEvent } = this.unwrapOrThrow(
      findSortingEvents(externalEvents),
      MASS_ID_SORTING_FINDINGS.render('ERROR.MISSING_SORTING_EVENT'),
    );

    const sortingFactor = this.unwrapOrThrow(
      getSortingFactor(recyclerAccreditationDocument, massIDDocument),
      MASS_ID_SORTING_FINDINGS.render('ERROR.MISSING_SORTING_FACTOR'),
    );

    const eventValues = this.unwrapOrThrow(
      getValidatedEventValues(priorEventWithValue, sortingEvent),
      (error: ValidationError) => {
        if (
          error.code === ValidationErrorCode.EVENT_BEFORE_SORTING_UNDEFINED ||
          error.code === ValidationErrorCode.INVALID_VALUE_BEFORE_SORTING
        ) {
          return MASS_ID_SORTING_FINDINGS.render(
            'ERROR.INVALID_VALUE_BEFORE_SORTING',
            priorEventWithValue?.value,
          );
        }

        return MASS_ID_SORTING_FINDINGS.render(
          'ERROR.INVALID_VALUE_AFTER_SORTING',
          sortingEvent.value,
        );
      },
    );

    const weightAttributes = this.unwrapOrThrow(
      getValidatedWeightAttributes(sortingEvent),
      (error: ValidationError) => {
        if (error.code === ValidationErrorCode.INVALID_DEDUCTED_WEIGHT_FORMAT) {
          return MASS_ID_SORTING_FINDINGS.render(
            'ERROR.INVALID_DEDUCTED_WEIGHT_FORMAT',
          );
        }

        if (error.code === ValidationErrorCode.INVALID_GROSS_WEIGHT) {
          return MASS_ID_SORTING_FINDINGS.render(
            'ERROR.INVALID_GROSS_WEIGHT',
            getEventAttributeValue(sortingEvent, GROSS_WEIGHT),
          );
        }

        if (error.code === ValidationErrorCode.INVALID_GROSS_WEIGHT_FORMAT) {
          return MASS_ID_SORTING_FINDINGS.render(
            'ERROR.INVALID_GROSS_WEIGHT_FORMAT',
          );
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

          return MASS_ID_SORTING_FINDINGS.render(
            'ERROR.INVALID_WEIGHT_COMPARISON',
            deductedWeight,
            grossWeight,
          );
        }

        return MASS_ID_SORTING_FINDINGS.render(
          'ERROR.INVALID_DEDUCTED_WEIGHT',
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
    renderedFinding:
      | ((error: ValidationError) => RenderedRuleFinding)
      | RenderedRuleFinding,
  ): T {
    if (isValidationError(result)) {
      throw this.processorErrors.getKnownError(
        typeof renderedFinding === 'function'
          ? renderedFinding(result)
          : renderedFinding,
      );
    }

    return result;
  }

  private validateOrThrow(
    condition: boolean,
    renderedFinding: RenderedRuleFinding,
  ): void {
    if (condition) {
      throw this.processorErrors.getKnownError(renderedFinding);
    }
  }
}
