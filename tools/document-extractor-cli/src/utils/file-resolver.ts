import { glob } from 'node:fs/promises';
import path from 'node:path';

import { isS3Uri } from './s3-uri.parser';

const hasGlobCharacters = (pattern: string): boolean =>
  /[*?[\]{}]/.test(pattern);

export const resolveFilePaths = async (pattern: string): Promise<string[]> => {
  if (isS3Uri(pattern)) {
    return [pattern];
  }

  if (!hasGlobCharacters(pattern)) {
    return [path.resolve(pattern)];
  }

  const files: string[] = [];

  for await (const file of glob(pattern)) {
    files.push(path.resolve(file));
  }

  if (files.length === 0) {
    throw new Error(`No files matched the pattern: ${pattern}`);
  }

  return files.sort((a, b) => a.localeCompare(b));
};
