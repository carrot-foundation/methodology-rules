import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonEmptyArray,
  isNonEmptyString,
  isNonZeroPositive,
} from '@carrot-fndn/shared/helpers';
import {
  getEventAttributeValue,
  getLastYearEmissionAndCompostingMetricsEvent,
} from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS_ID,
  PARTICIPANT_ACCREDITATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
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
import { getYear } from 'date-fns';

import { MassIdSortingProcessorErrors } from './mass-id-sorting.errors';

const { SORTING } = DocumentEventName;
const { DESCRIPTION, SORTING_FACTOR } = DocumentEventAttributeName;
const SORTING_TOLERANCE = 0.1;

export const RESULT_COMMENTS = {
  FAILED: (sortingValueCalculationDifference: number) =>
    `The calculated sorting value differs from the actual value by ${sortingValueCalculationDifference} kg, exceeding the allowed tolerance of ${SORTING_TOLERANCE} kg.`,
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

    this.validateOrThrow(
      !isNonEmptyArray(massIdDocument.externalEvents),
      this.processorErrors.ERROR_MESSAGE.MISSING_EXTERNAL_EVENTS,
    );

    const externalEvents = massIdDocument.externalEvents!;

    const sortingEventIndex = externalEvents.findIndex(
      eventNameIsAnyOf([SORTING]),
    );

    this.validateOrThrow(
      sortingEventIndex === -1,
      this.processorErrors.ERROR_MESSAGE.MISSING_SORTING_EVENT,
    );

    const sortingEvent = externalEvents[sortingEventIndex];
    const eventBeforeSorting = externalEvents[sortingEventIndex - 1];

    const valueBeforeSorting = eventBeforeSorting?.value;
    const valueAfterSorting = sortingEvent?.value;
    const emissionAndCompostingMetricsEvent =
      getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent:
          recyclerAccreditationDocument,
        documentYear: getYear(massIdDocument.externalCreatedAt),
      });
    const sortingFactor = getEventAttributeValue(
      emissionAndCompostingMetricsEvent,
      SORTING_FACTOR,
    );
    const sortingDescription = getEventAttributeValue(
      sortingEvent,
      DESCRIPTION,
    );

    this.validateOrThrow(
      !isNonZeroPositive(sortingFactor),
      this.processorErrors.ERROR_MESSAGE.MISSING_SORTING_FACTOR,
    );

    this.validateOrThrow(
      !isNonZeroPositive(valueBeforeSorting),
      this.processorErrors.ERROR_MESSAGE.INVALID_VALUE_BEFORE_SORTING(
        valueBeforeSorting,
      ),
    );

    this.validateOrThrow(
      !isNonZeroPositive(valueAfterSorting),
      this.processorErrors.ERROR_MESSAGE.INVALID_VALUE_AFTER_SORTING(
        valueAfterSorting,
      ),
    );

    const calculatedSortingValue =
      Number(valueBeforeSorting) * Number(sortingFactor);
    const sortingValueCalculationDifference = Math.abs(
      calculatedSortingValue - Number(valueAfterSorting),
    );

    return {
      calculatedSortingValue,
      sortingDescription,
      sortingFactor: Number(sortingFactor),
      sortingValueCalculationDifference,
      valueAfterSorting: Number(valueAfterSorting),
      valueBeforeSorting: Number(valueBeforeSorting),
    };
  }

  private validateOrThrow(condition: boolean, errorMessage: string): void {
    if (condition) {
      throw this.processorErrors.getKnownError(errorMessage);
    }
  }
}
