import { createAssertEquals } from 'typia';

import type {
  AiValidateAttachmentDto,
  ApiAiValidationResponse,
} from './ai-attachment-validator.api.dto';

export const assertValidateAttachmentDto =
  createAssertEquals<AiValidateAttachmentDto>();

export const assertApiAiValidationResponse =
  createAssertEquals<ApiAiValidationResponse>();
