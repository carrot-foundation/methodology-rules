import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { TextExtractionInput } from '@carrot-fndn/shared/text-extractor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNil, logger } from '@carrot-fndn/shared/helpers';
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
  type DocumentEvent,
  DocumentEventAttachmentLabel,
  DocumentEventWeighingCaptureMethod,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  getAttachmentS3Key,
  mapDocumentRelation,
} from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import {
  isScaleTicketVerificationConfig,
  verifyScaleTicketNetWeight,
} from './scale-ticket-verification/scale-ticket-verification.helpers';
import {
  NOT_FOUND_RESULT_COMMENTS,
  PASSED_RESULT_COMMENTS,
} from './weighing.constants';
import { WeighingProcessorErrors } from './weighing.errors';
import {
  getRequiredAdditionalVerificationsFromAccreditationDocument,
  getValuesRelatedToWeighing,
  getWeighingEvents,
  isExceptionValid,
  validateTwoStepWeighingEvents,
  validateWeighingValues,
} from './weighing.helpers';

interface DocumentPair {
  massIdDocument: Document;
  recyclerAccreditationDocument: Document;
}

interface RuleSubject {
  recyclerAccreditationDocument: Document;
  weighingEvents: DocumentEvent[];
}

export class WeighingProcessor extends RuleDataProcessor {
  protected readonly processorErrors = new WeighingProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentQuery = await this.generateDocumentQuery(ruleInput);
      const documentPair = await this.collectDocuments(documentQuery);
      const ruleSubject = this.getRuleSubject(documentPair);
      const evaluationResult = await this.evaluateResult(
        ruleSubject,
        ruleInput,
      );

      return mapToRuleOutput(ruleInput, evaluationResult.resultStatus, {
        resultComment: evaluationResult.resultComment,
      });
    } catch (error) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.FAILED, {
        resultComment: this.processorErrors.getResultCommentFromError(error),
      });
    }
  }

  protected async evaluateResult(
    { recyclerAccreditationDocument, weighingEvents }: RuleSubject,
    ruleInput: RuleInput,
  ): Promise<EvaluateResultOutput> {
    const initialValidation = this.validateWeighingEvents(weighingEvents);

    if (initialValidation) {
      return initialValidation;
    }

    const isTwoStepWeighingEvent = weighingEvents.length === 2;

    if (isTwoStepWeighingEvent) {
      const twoStepValidationMessages =
        validateTwoStepWeighingEvents(weighingEvents);

      if (twoStepValidationMessages.errors.length > 0) {
        return {
          resultComment: twoStepValidationMessages.errors.join(' '),
          resultStatus: RuleOutputStatus.FAILED,
        };
      }
    }

    const weighingEvent = weighingEvents[0] as DocumentEvent;
    const weighingValues = getValuesRelatedToWeighing(
      weighingEvent,
      recyclerAccreditationDocument,
    );

    const validationMessages = validateWeighingValues(
      weighingValues,
      isTwoStepWeighingEvent,
    );

    if (validationMessages.errors.length > 0) {
      return {
        resultComment: validationMessages.errors.join(' '),
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    const additionalVerifications =
      getRequiredAdditionalVerificationsFromAccreditationDocument(
        recyclerAccreditationDocument,
      );

    const scaleTicketConfig = additionalVerifications?.find(
      isScaleTicketVerificationConfig,
    );

    if (scaleTicketConfig) {
      const textExtractorInput = this.buildScaleTicketTextExtractorInput(
        weighingEvent,
        ruleInput,
      );

      const scaleTicketValidation = await verifyScaleTicketNetWeight({
        config: scaleTicketConfig,
        expectedNetWeight: weighingValues.eventValue,
        textExtractorInput,
      });

      if (scaleTicketValidation.errors.length > 0) {
        return {
          resultComment: scaleTicketValidation.errors.join(' '),
          resultStatus: RuleOutputStatus.FAILED,
        };
      }
    }

    let passMessage = '';

    const isTransportManifest =
      weighingValues.weighingCaptureMethod ===
      DocumentEventWeighingCaptureMethod.TRANSPORT_MANIFEST;

    if (isTransportManifest) {
      passMessage = PASSED_RESULT_COMMENTS.TRANSPORT_MANIFEST;
    } else if (isTwoStepWeighingEvent) {
      passMessage = PASSED_RESULT_COMMENTS.TWO_STEP;
    } else {
      passMessage = PASSED_RESULT_COMMENTS.SINGLE_STEP;
    }

    if (isExceptionValid(weighingValues.containerCapacityException)) {
      passMessage = PASSED_RESULT_COMMENTS.PASSED_WITH_EXCEPTION(passMessage);
    }

    if (
      isExceptionValid(weighingValues.tareException) &&
      isNil(weighingValues.tare?.value)
    ) {
      passMessage =
        PASSED_RESULT_COMMENTS.PASSED_WITH_TARE_EXCEPTION(passMessage);
    }

    return {
      resultComment: passMessage,
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

  protected getRuleSubject({
    massIdDocument,
    recyclerAccreditationDocument,
  }: DocumentPair): RuleSubject {
    const weighingEvents = getWeighingEvents(massIdDocument);

    return {
      recyclerAccreditationDocument,
      weighingEvents,
    };
  }

  private buildScaleTicketTextExtractorInput(
    weighingEvent: DocumentEvent,
    ruleInput: RuleInput,
  ): TextExtractionInput | undefined {
    const scaleTicketAttachment = weighingEvent.attachments?.find(
      (attachment) =>
        String(attachment.label) ===
        String(DocumentEventAttachmentLabel.WEIGHING_TICKET),
    );

    if (!scaleTicketAttachment) {
      return undefined;
    }

    const bucket = process.env['DOCUMENT_ATTACHMENT_BUCKET_NAME'];

    if (!bucket) {
      logger.warn(
        'DOCUMENT_ATTACHMENT_BUCKET_NAME environment variable is not configured',
      );

      return undefined;
    }

    const key = getAttachmentS3Key(
      ruleInput.documentId,
      scaleTicketAttachment.attachmentId,
    );

    const textExtractorInput: TextExtractionInput = {
      s3Bucket: bucket,
      s3Key: key,
    };

    return textExtractorInput;
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<Document>,
  ): Promise<DocumentPair> {
    let recyclerAccreditationDocument: Document | undefined;
    let massIdDocument: Document | undefined;

    await documentQuery.iterator().each(({ document }) => {
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
      massIdDocument: massIdDocument as Document,
      recyclerAccreditationDocument: recyclerAccreditationDocument as Document,
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
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (weighingEvents.length > 2) {
      return {
        resultComment: NOT_FOUND_RESULT_COMMENTS.MORE_THAN_TWO_WEIGHING_EVENTS,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    return undefined;
  }
}
