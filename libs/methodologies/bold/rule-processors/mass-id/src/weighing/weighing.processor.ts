import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNil } from '@carrot-fndn/shared/helpers';
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
  NOT_FOUND_RESULT_COMMENTS,
} from './weighing.constants';
import { WeighingProcessorErrors } from './weighing.errors';
import {
  getValuesRelatedToWeighing,
  getWeighingEvents,
  validateTwoStepWeighingEvents,
  validateWeighingValues,
} from './weighing.helpers';

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
    documentQuery: DocumentQuery<Document>,
  ): Promise<DocumentPair> {
    let recyclerHomologationDocument: Document | undefined;
    let massIdDocument: Document | undefined;

    await documentQuery.iterator().each(({ document }) => {
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

  private validateOrThrow(condition: boolean, errorMessage: string): void {
    if (condition) {
      throw this.processorErrors.getKnownError(errorMessage);
    }
  }

  private validateWeighingEvents(
    weighingEvents: DocumentEvent[] | undefined,
  ): EvaluateResultOutput | undefined {
    if (isNil(weighingEvents) || weighingEvents.length === 0) {
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
    const initialValidation = this.validateWeighingEvents(weighingEvents);

    if (initialValidation) {
      return initialValidation;
    }

    const isTwoStepWeighingEvent = weighingEvents.length === 2;

    if (isTwoStepWeighingEvent) {
      const twoStepValidationMessages =
        validateTwoStepWeighingEvents(weighingEvents);

      if (twoStepValidationMessages.length > 0) {
        return {
          resultComment: twoStepValidationMessages.join(' '),
          resultStatus: RuleOutputStatus.REJECTED,
        };
      }
    }

    const weighingEvent = weighingEvents[0] as DocumentEvent;
    const weighingValues = getValuesRelatedToWeighing(
      weighingEvent,
      recyclerHomologationDocument,
    );

    const validationMessages = validateWeighingValues(
      weighingValues,
      isTwoStepWeighingEvent,
    );

    if (validationMessages.length > 0) {
      return {
        resultComment: validationMessages.join(' '),
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    let approvalMessage = '';

    const isTransportManifest =
      weighingValues.weighingCaptureMethod ===
      DocumentEventWeighingCaptureMethod.TRANSPORT_MANIFEST;

    if (isTransportManifest) {
      approvalMessage = APPROVED_RESULT_COMMENTS.TRANSPORT_MANIFEST;
    } else if (isTwoStepWeighingEvent) {
      approvalMessage = APPROVED_RESULT_COMMENTS.TWO_STEP;
    } else {
      approvalMessage = APPROVED_RESULT_COMMENTS.SINGLE_STEP;
    }

    if (!isNil(weighingValues.containerCapacityException)) {
      approvalMessage =
        APPROVED_RESULT_COMMENTS.APPROVED_WITH_EXCEPTION(approvalMessage);
    }

    return {
      resultComment: approvalMessage,
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
      const documentQuery = await this.generateDocumentQuery(ruleInput);
      const documentPair = await this.collectDocuments(documentQuery);
      const ruleSubject = this.getRuleSubject(documentPair);
      const evaluationResult = this.evaluateResult(ruleSubject);

      return mapToRuleOutput(ruleInput, evaluationResult.resultStatus, {
        resultComment: evaluationResult.resultComment,
      });
    } catch (error) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
        resultComment: this.processorErrors.getResultCommentFromError(error),
      });
    }
  }
}
