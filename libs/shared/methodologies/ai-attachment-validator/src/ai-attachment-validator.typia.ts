import { createAssert } from 'typia';

import type {
  AiValidateAttachmentDto,
  ApiAiValidationResponse,
} from './ai-attachment-validator.api.dto';

export const assertAiValidateAttachmentDto =
  createAssert<AiValidateAttachmentDto>();

export const assertApiAiValidationResponse =
  createAssert<ApiAiValidationResponse>();
