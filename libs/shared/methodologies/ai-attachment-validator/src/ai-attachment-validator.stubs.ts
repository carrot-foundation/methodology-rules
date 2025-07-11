import { random } from 'typia';

import {
  AiValidateAttachmentDto,
  ApiAiValidationResponse,
} from './ai-attachment-validator.api.dto';

export const stubApiAiValidationResponse = (
  partial?: Partial<ApiAiValidationResponse>,
) => partial || random<ApiAiValidationResponse>();

export const stubAiValidateAttachmentDto = (
  partial?: Partial<AiValidateAttachmentDto>,
) => ({
  ...random<AiValidateAttachmentDto>(),
  ...partial,
});
