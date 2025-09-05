import { AwsHttpService } from '@carrot-fndn/shared/aws-http';
import { logger } from '@carrot-fndn/shared/helpers';
import axios from 'axios';

import type {
  AiValidateAttachmentDto,
  ApiAiValidationResponse,
  ApiValidateAttachmentResponse,
} from './ai-attachment-validator.api.dto';

import {
  FIELD_SEPARATOR,
  getAiAttachmentValidatorApiUri,
  VALID_MESSAGE,
  VALIDATION_UNAVAILABLE_MESSAGE,
} from './ai-attachment-validator.constants';
import { formatInvalidField } from './ai-attachment-validator.helpers';
import {
  assertAiValidateAttachmentDto,
  assertApiAiValidationResponse,
} from './ai-attachment-validator.typia';

export class AiAttachmentValidatorService extends AwsHttpService {
  constructor() {
    super(axios.create());
  }

  async validateAttachment(
    dto: AiValidateAttachmentDto,
  ): Promise<ApiValidateAttachmentResponse> {
    assertAiValidateAttachmentDto(dto);

    try {
      const mappedDto = this.mapValidateAttachmentDto(dto);
      const { results } = await this.post<{ results: unknown }>(
        getAiAttachmentValidatorApiUri(),
        mappedDto,
      );

      return this.processValidationResult(results);
    } catch (error) {
      this.logValidationError(error);

      return this.createFailureResponse();
    }
  }

  private buildValidationResponse(
    validatedResult: ApiAiValidationResponse,
    invalidFields: string,
  ): ApiValidateAttachmentResponse {
    const baseResponse = {
      reasoning: validatedResult.validation.reasoning,
      usage: validatedResult.usage,
    };

    return invalidFields.length > 0
      ? {
          isValid: false,
          ...baseResponse,
          validationResponse: invalidFields,
        }
      : {
          isValid: true,
          ...baseResponse,
          validationResponse: VALID_MESSAGE,
        };
  }

  private createFailureResponse(): ApiValidateAttachmentResponse {
    return {
      isValid: false,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      validationResponse: VALIDATION_UNAVAILABLE_MESSAGE,
    };
  }

  private extractInvalidFields(
    validatedResult: ApiAiValidationResponse,
  ): string {
    return validatedResult.validation.fields
      .filter((field) => !field.isValid)
      .map((field) => formatInvalidField(field.fieldName, field.invalidReason))
      .join(FIELD_SEPARATOR);
  }

  private logValidationError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn('AI validation failed:', errorMessage);
  }

  private mapValidateAttachmentDto(
    dto: AiValidateAttachmentDto,
  ): Record<string, unknown> {
    return {
      attachmentPaths: [dto.attachmentPath],
      documentJson: dto.document,
      ...(dto.systemPrompt && { systemPrompt: dto.systemPrompt }),
    };
  }

  private processValidationResult(
    validationResult: unknown,
  ): ApiValidateAttachmentResponse {
    const validatedResult = assertApiAiValidationResponse(validationResult);
    const invalidFields = this.extractInvalidFields(validatedResult);

    return this.buildValidationResponse(validatedResult, invalidFields);
  }
}
