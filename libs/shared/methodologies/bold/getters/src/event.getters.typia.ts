import { type DocumentEventWithMetadata } from '@carrot-fndn/shared/methodologies/bold/types';
import { createValidate } from 'typia';

export const validateDocumentEventWithMetadata =
  createValidate<DocumentEventWithMetadata>();
