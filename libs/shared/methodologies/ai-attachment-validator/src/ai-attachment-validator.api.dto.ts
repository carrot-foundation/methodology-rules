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
  file: string;
  size: number;
}

export interface OptimizedDocumentEvent {
  addressId: NonEmptyString;
  attachment?: OptimizedAttachment | undefined;
  externalCreatedAt: DateTime;
  externalId?: string | undefined;
  id: string;
  label?: string | undefined;
  meta?:
    | undefined
    | {
        [key: string]: unknown;
      };
  name: string;
  participantId: string;
  value?: number | undefined;
}

export interface OptimizedDocumentJson {
  addresses: Record<string, OptimizedAddress>;
  category: string;
  currentValue: number & tags.Minimum<0> & tags.Type<'float'>;
  events?: OptimizedDocumentEvent[] | undefined;
  externalCreatedAt: DateTime;
  externalId?: string | undefined;
  id: string;
  measurementUnit: string;
  participants: Record<string, OptimizedParticipant>;
  status: string;
  subtype?: string | undefined;
  type?: string | undefined;
}

export interface OptimizedParticipant {
  country: string;
  name: string;
  taxId: string;
  type: string;
}

export interface TokenUsage {
  inputTokens: NonZeroPositiveInt;
  outputTokens: NonZeroPositiveInt;
  totalTokens: NonZeroPositiveInt;
}

export interface ValidationField {
  fieldName: string;
  invalidReason: null | string;
  isValid: boolean;
  value: unknown;
}

export interface ValidationResult {
  fields: ValidationField[];
  reasoning: string;
}
