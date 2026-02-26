import { logger } from '@carrot-fndn/shared/helpers';

import type {
  TextExtractionInput,
  TextExtractionResult,
  TextExtractor,
} from './text-extractor.types';

import { CachedTextExtractor } from './cached-text-extractor';
import { loadCachedResult, saveCachedResult } from './textract-cache';

jest.mock('./textract-cache', () => ({
  computeFileHash: jest.requireActual('./textract-cache').computeFileHash,
  computeStringHash: jest.requireActual('./textract-cache').computeStringHash,
  loadCachedResult: jest.fn(),
  saveCachedResult: jest.fn(),
}));

const mockLoadCachedResult = jest.mocked(loadCachedResult);
const mockSaveCachedResult = jest.mocked(saveCachedResult);

const stubResult: TextExtractionResult = {
  blocks: [{ blockType: 'LINE', id: 'b1', text: 'hello' }],
  rawText: 'hello' as TextExtractionResult['rawText'],
};

describe('CachedTextExtractor', () => {
  // eslint-disable-next-line sonarjs/publicly-writable-directories
  const cacheDirectory = '/tmp/test-cache';
  let delegate: jest.Mocked<TextExtractor>;
  let extractor: CachedTextExtractor;

  beforeEach(() => {
    delegate = {
      extractText: jest.fn().mockResolvedValue(stubResult),
    };
    extractor = new CachedTextExtractor(delegate, cacheDirectory);

    jest.spyOn(logger, 'info').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cache miss', () => {
    beforeEach(() => {
      mockLoadCachedResult.mockResolvedValue(undefined);
    });

    it('should delegate to wrapped extractor and save result to disk', async () => {
      const input: TextExtractionInput = {
        s3Bucket: 'my-bucket',
        s3Key: 'my-key',
      };

      const result = await extractor.extractText(input);

      expect(result).toStrictEqual(stubResult);
      expect(delegate.extractText).toHaveBeenCalledWith(input);
      expect(mockSaveCachedResult).toHaveBeenCalledWith(
        cacheDirectory,
        expect.any(String),
        stubResult,
      );
    });
  });

  describe('cache hit', () => {
    beforeEach(() => {
      mockLoadCachedResult.mockResolvedValue(stubResult);
    });

    it('should return cached result without calling delegate', async () => {
      const input: TextExtractionInput = {
        s3Bucket: 'my-bucket',
        s3Key: 'my-key',
      };

      const result = await extractor.extractText(input);

      expect(result).toStrictEqual(stubResult);
      expect(delegate.extractText).not.toHaveBeenCalled();
      expect(mockSaveCachedResult).not.toHaveBeenCalled();
    });
  });

  describe('S3 cache key format', () => {
    beforeEach(() => {
      mockLoadCachedResult.mockResolvedValue(undefined);
    });

    it('should compute cache key from s3://bucket/key format', async () => {
      const input: TextExtractionInput = {
        s3Bucket: 'my-bucket',
        s3Key: 'path/to/file.pdf',
      };

      await extractor.extractText(input);

      const callArguments = mockLoadCachedResult.mock.calls[0];

      expect(callArguments).toBeDefined();
      expect(callArguments![0]).toBe(cacheDirectory);
      expect(callArguments![1]).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
    });
  });

  describe('local file input', () => {
    beforeEach(() => {
      mockLoadCachedResult.mockResolvedValue(undefined);
    });

    it('should use filePath for cache key', async () => {
      const input: TextExtractionInput = {
        filePath: '/path/to/local/file.pdf',
      };

      await extractor.extractText(input);

      const callArguments = mockLoadCachedResult.mock.calls[0];

      expect(callArguments).toBeDefined();
      expect(callArguments![0]).toBe(cacheDirectory);
      expect(callArguments![1]).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
    });
  });

  describe('no cacheable input', () => {
    it('should delegate without caching when no s3 or filePath provided', async () => {
      const input: TextExtractionInput = {};

      const result = await extractor.extractText(input);

      expect(result).toStrictEqual(stubResult);
      expect(delegate.extractText).toHaveBeenCalledWith(input);
      expect(mockLoadCachedResult).not.toHaveBeenCalled();
      expect(mockSaveCachedResult).not.toHaveBeenCalled();
    });
  });
});
