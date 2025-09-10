import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  DateTime,
  NonEmptyString,
  NonZeroPositiveInt,
} from '@carrot-fndn/shared/types';
import { tags } from 'typia';

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

export interface OptimizedAddress {
  city: string;
  country: string;
  lat: number;
  lng: number;
  num: string;
  state: string;
  street: string;
  zip: string;
}

export interface OptimizedAttachment {
  file: NonEmptyString;
  size: number;
}

export interface OptimizedDocumentEvent {
  aId: NonEmptyString; // address ID
  attachment?: OptimizedAttachment | undefined;
  externalCreatedAt: DateTime;
  externalId?: NonEmptyString | undefined;
  id: NonEmptyString;
  label?: NonEmptyString | undefined;
  meta?: // shorter metadata -> properties
  | undefined
    | {
        [key: string]: unknown;
      };
  name: NonEmptyString;
  pId: NonEmptyString; // participant ID
  value?: number | undefined;
}

export interface OptimizedDocumentJson {
  addresses: Record<NonEmptyString, OptimizedAddress>;
  category: NonEmptyString;
  currentValue: number & tags.Minimum<0> & tags.Type<'float'>;
  events?: OptimizedDocumentEvent[] | undefined;
  externalCreatedAt: DateTime;
  externalId?: NonEmptyString | undefined;
  id: NonEmptyString;
  measurementUnit: NonEmptyString;
  participants: Record<NonEmptyString, OptimizedParticipant>;
  status: NonEmptyString;
  subtype?: NonEmptyString | undefined;
  type?: NonEmptyString | undefined;
}

export interface OptimizedParticipant {
  country: NonEmptyString;
  name: NonEmptyString;
  taxId: NonEmptyString;
  type: NonEmptyString;
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
