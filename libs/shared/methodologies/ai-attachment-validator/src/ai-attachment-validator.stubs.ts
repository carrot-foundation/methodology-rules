import { random } from 'typia';

import {
  AiValidateAttachmentDto,
  ApiAiValidationResponse,
} from './ai-attachment-validator.api.dto';

export const stubApiAiValidationResponse = (
  partial?: Partial<ApiAiValidationResponse>,
) => [...random<ApiAiValidationResponse>(), ...(partial ? [...partial] : [])];

export const stubAiValidateAttachmentDto = (
  partial?: Partial<AiValidateAttachmentDto>,
) => ({
  ...random<AiValidateAttachmentDto>(),
  ...partial,
});
