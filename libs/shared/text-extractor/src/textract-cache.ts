import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { TextExtractionResult } from './text-extractor.types';

export const computeFileHash = async (filePath: string): Promise<string> => {
  const content = await readFile(filePath);

  return createHash('sha256').update(content).digest('hex');
};

export const computeStringHash = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const loadCachedResult = async (
  cacheDirectory: string,
  hash: string,
): Promise<TextExtractionResult | undefined> => {
  try {
    const filePath = path.join(cacheDirectory, `${hash}.json`);
    const content = await readFile(filePath, 'utf8');

    return JSON.parse(content) as TextExtractionResult;
  } catch {
    return undefined;
  }
};

export const saveCachedResult = async (
  cacheDirectory: string,
  hash: string,
  result: TextExtractionResult,
): Promise<void> => {
  await mkdir(cacheDirectory, { recursive: true });

  const filePath = path.join(cacheDirectory, `${hash}.json`);

  await writeFile(filePath, JSON.stringify(result), 'utf8');
};
