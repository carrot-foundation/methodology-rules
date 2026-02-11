import type { TextExtractionResult } from '@carrot-fndn/shared/text-extractor';

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  computeFileHash,
  computeStringHash,
  loadCachedResult,
  saveCachedResult,
} from './textract-cache';

const stubResult: TextExtractionResult = {
  blocks: [{ id: 'block-1', text: 'hello' }],
  rawText: 'hello' as TextExtractionResult['rawText'],
};

describe('textract-cache', () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'textract-cache-'),
    );
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { force: true, recursive: true });
  });

  describe('computeFileHash', () => {
    it('should return consistent SHA-256 for same content', async () => {
      const filePath = path.join(temporaryDirectory, 'test.pdf');

      await writeFile(filePath, 'file content');

      const hash1 = await computeFileHash(filePath);
      const hash2 = await computeFileHash(filePath);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should return different hashes for different content', async () => {
      const file1 = path.join(temporaryDirectory, 'a.pdf');
      const file2 = path.join(temporaryDirectory, 'b.pdf');

      await writeFile(file1, 'content A');
      await writeFile(file2, 'content B');

      const hash1 = await computeFileHash(file1);
      const hash2 = await computeFileHash(file2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('computeStringHash', () => {
    it('should return consistent SHA-256 for same string', () => {
      const hash1 = computeStringHash('s3://bucket/key');
      const hash2 = computeStringHash('s3://bucket/key');

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should return different hashes for different strings', () => {
      const hash1 = computeStringHash('s3://bucket/key1');
      const hash2 = computeStringHash('s3://bucket/key2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('loadCachedResult', () => {
    it('should return parsed result from valid cache file', async () => {
      const hash = 'abc123';

      await writeFile(
        path.join(temporaryDirectory, `${hash}.json`),
        JSON.stringify(stubResult),
      );

      const result = await loadCachedResult(temporaryDirectory, hash);

      expect(result).toStrictEqual(stubResult);
    });

    it('should return undefined for missing file', async () => {
      const result = await loadCachedResult(temporaryDirectory, 'nonexistent');

      expect(result).toBeUndefined();
    });

    it('should return undefined for corrupt JSON', async () => {
      const hash = 'corrupt';

      await writeFile(
        path.join(temporaryDirectory, `${hash}.json`),
        '{invalid json',
      );

      const result = await loadCachedResult(temporaryDirectory, hash);

      expect(result).toBeUndefined();
    });
  });

  describe('saveCachedResult', () => {
    it('should create cache dir and write JSON file', async () => {
      const cacheDirectory = path.join(temporaryDirectory, 'nested', 'cache');
      const hash = 'def456';

      await saveCachedResult(cacheDirectory, hash, stubResult);

      const content = await readFile(
        path.join(cacheDirectory, `${hash}.json`),
        'utf8',
      );

      expect(JSON.parse(content)).toStrictEqual(stubResult);
    });
  });
});
