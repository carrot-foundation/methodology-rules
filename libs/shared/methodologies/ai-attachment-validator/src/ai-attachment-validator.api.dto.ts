import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';
import { NonEmptyString, NonZeroPositiveInt } from '@carrot-fndn/shared/types';

export interface AiValidateAttachmentDto {
  attachmentPath: NonEmptyString;
  document: Document;
  systemPrompt?: NonEmptyString | undefined;
}

export interface ApiAiValidationResponse {
  usage: TokenUsage;
  validation: ValidationResult;
}

export interface ApiValidateAttachmentResponse {
  isValid: boolean;
  reasoning?: NonEmptyString;
  usage: TokenUsage;
  validationResponse: NonEmptyString;
}

export interface TokenUsage {
  inputTokens: NonZeroPositiveInt;
  outputTokens: NonZeroPositiveInt;
  totalTokens: NonZeroPositiveInt;
}

export interface ValidationField {
  fieldName: NonEmptyString;
  invalidReason: NonEmptyString | null;
  isValid: boolean;
  value: unknown;
}

export interface ValidationResult {
  fields: ValidationField[];
  reasoning: NonEmptyString;
}
