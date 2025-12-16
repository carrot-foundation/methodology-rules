import { createAssert } from 'typia';

import type {
  TextExtractionInput,
  TextExtractionResult,
} from './text-extractor.types';

export const assertTextExtractionInput = createAssert<TextExtractionInput>();

export const assertTextExtractionResultRawText =
  createAssert<TextExtractionResult['rawText']>();
