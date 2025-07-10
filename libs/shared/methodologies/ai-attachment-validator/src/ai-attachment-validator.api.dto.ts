import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyArray, NonEmptyString } from '@carrot-fndn/shared/types';

export interface AiValidateAttachmentDto {
  additionalContext?: NonEmptyString | undefined;
  attachmentPath: NonEmptyString;
  document: Document;
}

export type ApiAiValidationResponse = NonEmptyArray<{
  fieldName: NonEmptyString;
  invalidReason: NonEmptyString | null;
  isValid: boolean;
  value: unknown;
}>;

export interface ApiValidateAttachmentResponse {
  isValid: boolean;
  validationResponse: NonEmptyString;
}
