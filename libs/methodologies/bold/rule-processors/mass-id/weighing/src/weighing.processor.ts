import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { TextExtractionInput } from '@carrot-fndn/shared/text-extractor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { getDocumentAttachmentBucketName } from '@carrot-fndn/shared/env';
import { isNil, logger } from '@carrot-fndn/shared/helpers';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS_ID,
  PARTICIPANT_ACCREDITATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import { validateRuleSubjectOrThrow } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  BoldAttachmentLabel,
  type BoldDocument,
  type BoldDocumentEvent,
  BoldDocumentSubtype,
  BoldWeighingCaptureMethod,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  getAttachmentS3Key,
  mapDocumentRelation,
} from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import {
  AdditionalVerification,
  NonEmptyString,
} from '@carrot-fndn/shared/types';

import {
  isScaleTicketVerificationConfig,
  verifyScaleTicketNetWeight,
} from './scale-ticket-verification/scale-ticket-verification.helpers';
import { PASSED_RESULT_COMMENTS } from './weighing.constants';
import { WeighingProcessorErrors } from './weighing.errors';
import {
  getRequiredAdditionalVerificationsFromAccreditationDocument,
  getValuesRelatedToWeighing,
  getWeighingEvents,
  isExceptionValid,
  validateTwoStepWeighingEvents,
  validateWeighingValues,
  type WeighingValues,
} from './weighing.helpers';
import {
  type WeighingRuleSubject,
  WeighingRuleSubjectSchema,
} from './weighing.rule-subject';

interface DocumentPair {
  massIDDocument: BoldDocument;
  recyclerAccreditationDocument: BoldDocument;
}

export class WeighingProcessor extends RuleDataProcessor {
  protected readonly processorErrors = new WeighingProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentQuery = await this.generateDocumentQuery(ruleInput);
      const documentPair = await this.collectDocuments(documentQuery);
      const rawSubject = this.getRuleSubject(documentPair);
      const ruleSubject = validateRuleSubjectOrThrow({
        errors: this.processorErrors,
        input: rawSubject,
        schema: WeighingRuleSubjectSchema,
        validationMessage:
          this.processorErrors.ERROR_MESSAGE.INVALID_RULE_SUBJECT,
      });
      const evaluationResult = await this.evaluateResult(ruleSubject);

      return mapToRuleOutput(ruleInput, evaluationResult.resultStatus, {
        resultComment: evaluationResult.resultComment,
      });
    } catch (error) {
      logger.error(
        {
          documentId: ruleInput.documentId,
          err: error,
          operation: 'weighing:process',
          ruleId: ruleInput.ruleName,
        },
        'Weighing processor failed',
      );

      return mapToRuleOutput(ruleInput, 'FAILED', {
        resultComment: this.processorErrors.getResultCommentFromError(error),
      });
    }
  }

  protected buildPassMessage({
    isTwoStepWeighingEvent,
    scaleTicketValidated,
    weighingValues,
  }: {
    isTwoStepWeighingEvent: boolean;
    scaleTicketValidated: boolean;
    weighingValues: WeighingValues;
  }): string {
    const isTransportManifest =
      weighingValues.weighingCaptureMethod ===
      BoldWeighingCaptureMethod.TRANSPORT_MANIFEST;

    let passMessage = '';

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
      isExceptionValid(weighingValues.containerQuantityException) &&
      isNil(weighingValues.containerQuantity)
    ) {
      passMessage =
        PASSED_RESULT_COMMENTS.PASSED_WITH_CONTAINER_QUANTITY_EXCEPTION(
          passMessage,
        );
    }

    if (
      isExceptionValid(weighingValues.tareException) &&
      isNil(weighingValues.tare?.value)
    ) {
      passMessage =
        PASSED_RESULT_COMMENTS.PASSED_WITH_TARE_EXCEPTION(passMessage);
    }

    if (scaleTicketValidated) {
      passMessage =
        PASSED_RESULT_COMMENTS.PASSED_WITH_SCALE_TICKET_VALIDATION(passMessage);
    }

    return passMessage;
  }

  protected async evaluateResult({
    massIDDocumentId,
    recyclerAccreditationDocument,
    weighingEvents,
  }: WeighingRuleSubject): Promise<EvaluateResultOutput> {
    const isTwoStepWeighingEvent = weighingEvents.length === 2;

    if (isTwoStepWeighingEvent) {
      const twoStepValidationMessages =
        validateTwoStepWeighingEvents(weighingEvents);

      if (twoStepValidationMessages.errors.length > 0) {
        return {
          resultComment: twoStepValidationMessages.errors.join(' '),
          resultStatus: 'FAILED',
        };
      }
    }

    const weighingEvent = weighingEvents[0]!;
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
        resultStatus: 'FAILED',
      };
    }

    const additionalVerifications =
      getRequiredAdditionalVerificationsFromAccreditationDocument(
        recyclerAccreditationDocument,
      );

    const scaleTicketConfig = additionalVerifications?.find(
      isScaleTicketVerificationConfig,
    );

    const scaleTicketValidationResult = await this.validateScaleTicket({
      expectedNetWeight: weighingValues.eventValue,
      massIDDocumentId,
      scaleTicketConfig,
      weighingEvent,
    });

    if (scaleTicketValidationResult.errorResult) {
      return scaleTicketValidationResult.errorResult;
    }

    const scaleTicketValidated = scaleTicketValidationResult.validated;

    const passMessage = this.buildPassMessage({
      isTwoStepWeighingEvent,
      scaleTicketValidated,
      weighingValues,
    });

    return {
      resultComment: passMessage,
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

  protected getRuleSubject({
    massIDDocument,
    recyclerAccreditationDocument,
  }: DocumentPair): WeighingRuleSubject {
    const weighingEvents = getWeighingEvents(massIDDocument);

    return {
      massIDDocumentId: massIDDocument.id,
      recyclerAccreditationDocument,
      weighingEvents,
    };
  }

  protected async validateScaleTicket({
    expectedNetWeight,
    massIDDocumentId,
    scaleTicketConfig,
    weighingEvent,
  }: {
    expectedNetWeight: number | undefined;
    massIDDocumentId: NonEmptyString;
    scaleTicketConfig: AdditionalVerification | undefined;
    weighingEvent: BoldDocumentEvent;
  }): Promise<{
    errorResult?: EvaluateResultOutput;
    validated: boolean;
  }> {
    if (!scaleTicketConfig || expectedNetWeight === undefined) {
      return { validated: false };
    }

    const textExtractorInput = this.buildScaleTicketTextExtractorInput(
      weighingEvent,
      massIDDocumentId,
    );

    const scaleTicketValidation = await verifyScaleTicketNetWeight({
      config: scaleTicketConfig,
      expectedNetWeight,
      textExtractorInput,
    });

    if (scaleTicketValidation.errors.length > 0) {
      return {
        errorResult: {
          resultComment: scaleTicketValidation.errors.join(' '),
          resultStatus: 'FAILED',
        },
        validated: false,
      };
    }

    return { validated: true };
  }

  private buildScaleTicketTextExtractorInput(
    weighingEvent: BoldDocumentEvent,
    massIDDocumentId: NonEmptyString,
  ): TextExtractionInput | undefined {
    const scaleTicketAttachment = weighingEvent.attachments?.find(
      (attachment) =>
        String(attachment.label) ===
        String(BoldAttachmentLabel.WEIGHING_TICKET),
    );

    if (!scaleTicketAttachment) {
      return undefined;
    }

    const bucket = getDocumentAttachmentBucketName();

    if (!bucket) {
      logger.warn(
        'DOCUMENT_ATTACHMENT_BUCKET_NAME environment variable is not configured',
      );

      return undefined;
    }

    const key = getAttachmentS3Key(
      massIDDocumentId,
      scaleTicketAttachment.attachmentId,
    );

    const textExtractorInput: TextExtractionInput = {
      s3Bucket: bucket,
      s3Key: key,
    };

    return textExtractorInput;
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<BoldDocument>,
  ): Promise<DocumentPair> {
    let recyclerAccreditationDocument: BoldDocument | undefined;
    let massIDDocument: BoldDocument | undefined;

    await documentQuery.iterator().each(({ document }) => {
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
      this.processorErrors.ERROR_MESSAGE
        .MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
    );

    this.validateOrThrow(
      isNil(massIDDocument),
      this.processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
    );

    return {
      massIDDocument: massIDDocument as BoldDocument,
      recyclerAccreditationDocument:
        recyclerAccreditationDocument as BoldDocument,
    };
  }

  private validateOrThrow(condition: boolean, errorMessage: string): void {
    if (condition) {
      throw this.processorErrors.getKnownError(errorMessage);
    }
  }
}
