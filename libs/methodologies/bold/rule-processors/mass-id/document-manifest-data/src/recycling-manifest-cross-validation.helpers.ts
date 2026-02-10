import type {
  BaseExtractedData,
  ExtractionOutput,
} from '@carrot-fndn/shared/document-extractor';

import type {
  DocumentManifestEventSubject,
  ValidationResult,
} from './document-manifest-data.helpers';

import { validateBasicExtractedData } from './cross-validation.helpers';

export const validateCdfExtractedData = (
  extractionResult: ExtractionOutput<BaseExtractedData>,
  eventSubject: DocumentManifestEventSubject,
): ValidationResult =>
  validateBasicExtractedData(extractionResult, eventSubject);
