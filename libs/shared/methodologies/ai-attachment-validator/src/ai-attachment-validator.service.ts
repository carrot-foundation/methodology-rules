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
  VALIDATION_MODE,
  VALIDATION_UNAVAILABLE_MESSAGE,
} from './ai-attachment-validator.constants';
import { formatInvalidField } from './ai-attachment-validator.helpers';
import {
  assertApiAiValidationResponse,
  assertAiValidateAttachmentDto,
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

      const aiValidationResult = await this.post<ApiAiValidationResponse>(
        getAiAttachmentValidatorApiUri(),
        mappedDto,
      );

      return this.processValidationResult(aiValidationResult);
    } catch (error) {
      logger.debug(
        'AI validation failed:',
        error instanceof Error ? error.message : String(error),
      );

      return {
        isValid: false,
        validationResponse: VALIDATION_UNAVAILABLE_MESSAGE,
      };
    }
  }

  private mapValidateAttachmentDto(
    dto: AiValidateAttachmentDto,
  ): Record<string, unknown> {
    return {
      attachmentPaths: [dto.attachmentPath],
      documentJson: dto.document,
      mode: VALIDATION_MODE,
      ...(dto.additionalContext && { context: dto.additionalContext }),
    };
  }

  private processValidationResult(
    validationResult: ApiAiValidationResponse,
  ): ApiValidateAttachmentResponse {
    assertApiAiValidationResponse(validationResult);

    const invalidFields = validationResult
      .filter((field) => !field.isValid)
      .map((field) => formatInvalidField(field.fieldName, field.invalidReason))
      .join(FIELD_SEPARATOR);

    return invalidFields.length > 0
      ? {
          isValid: false,
          validationResponse: invalidFields,
        }
      : {
          isValid: true,
          validationResponse: VALID_MESSAGE,
        };
  }
}
