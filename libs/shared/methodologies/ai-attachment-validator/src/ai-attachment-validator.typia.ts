import { createAssert } from 'typia';

import type {
  AiValidateAttachmentDto,
  ApiAiValidationResponse,
  OptimizedDocumentJson,
} from './ai-attachment-validator.api.dto';

export const assertAiValidateAttachmentDto =
  createAssert<AiValidateAttachmentDto>();

export const assertApiAiValidationResponse =
  createAssert<ApiAiValidationResponse>();

export const assertOptimizedDocumentJson =
  createAssert<OptimizedDocumentJson>();
