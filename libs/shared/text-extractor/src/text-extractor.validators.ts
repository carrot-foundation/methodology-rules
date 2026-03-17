import { NonEmptyStringSchema } from '@carrot-fndn/shared/types';
import { z } from 'zod';

import type {
  TextExtractionInput,
  TextExtractionResult,
} from './text-extractor.types';

const TextExtractionInputSchema = z.object({
  filePath: z.string().optional(),
  s3Bucket: z.string().optional(),
  s3Key: z.string().optional(),
});

export const assertTextExtractionInput = (v: unknown): TextExtractionInput =>
  TextExtractionInputSchema.parse(v) as TextExtractionInput;

export const assertTextExtractionResultRawText = (
  v: unknown,
): TextExtractionResult['rawText'] => NonEmptyStringSchema.parse(v);
