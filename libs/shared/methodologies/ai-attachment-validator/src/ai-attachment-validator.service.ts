import { AwsHttpService } from '@carrot-fndn/shared/aws-http';
import { logger } from '@carrot-fndn/shared/helpers';
import { NonEmptyString } from '@carrot-fndn/shared/types';
import axios from 'axios';

import type {
  AiValidateAttachmentDto,
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

      const { results } = await this.post<{ results: NonEmptyString }>(
        getAiAttachmentValidatorApiUri(),
        mappedDto,
      );

      return this.processValidationResult(JSON.parse(results));
    } catch (error) {
      logger.warn(
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
    validationResult: unknown,
  ): ApiValidateAttachmentResponse {
    const validatedResult = assertApiAiValidationResponse(validationResult);

    const invalidFields = validatedResult
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
