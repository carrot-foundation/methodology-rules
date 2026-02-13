import { logger } from '@carrot-fndn/shared/helpers';

import type {
  TextExtractionInput,
  TextExtractionResult,
  TextExtractor,
} from './text-extractor.types';

import {
  computeStringHash,
  loadCachedResult,
  saveCachedResult,
} from './textract-cache';

export class CachedTextExtractor implements TextExtractor {
  constructor(
    private readonly delegate: TextExtractor,
    private readonly cacheDirectory: string,
  ) {}

  async extractText(input: TextExtractionInput): Promise<TextExtractionResult> {
    const cacheKey = this.computeCacheKey(input);

    if (cacheKey) {
      const cached = await loadCachedResult(this.cacheDirectory, cacheKey);

      if (cached) {
        logger.info(`Using cached Textract output (...${cacheKey.slice(-8)})`);

        return cached;
      }
    }

    const result = await this.delegate.extractText(input);

    if (cacheKey) {
      await saveCachedResult(this.cacheDirectory, cacheKey, result);
      logger.info(`Cached Textract output (...${cacheKey.slice(-8)})`);
    }

    return result;
  }

  private computeCacheKey(input: TextExtractionInput): string | undefined {
    if (input.s3Bucket && input.s3Key) {
      return computeStringHash(`s3://${input.s3Bucket}/${input.s3Key}`);
    }

    if (input.filePath) {
      return computeStringHash(input.filePath);
    }

    return undefined;
  }
}
