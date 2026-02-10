import { glob, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { isS3Uri } from './s3-uri.parser';

const SUPPORTED_EXTENSIONS = '*.{pdf,png,jpg,jpeg,tiff}';

const hasGlobCharacters = (pattern: string): boolean =>
  /[*?[\]{}]/.test(pattern);

const resolveDirectory = async (directoryPath: string): Promise<string[]> => {
  const globPattern = path.join(directoryPath, '**', SUPPORTED_EXTENSIONS);
  const files: string[] = [];

  for await (const file of glob(globPattern)) {
    files.push(path.resolve(file));
  }

  if (files.length === 0) {
    throw new Error(`No supported files found in directory: ${directoryPath}`);
  }

  return files.sort((a, b) => a.localeCompare(b));
};

const resolveListFile = async (filePath: string): Promise<string[]> => {
  const content = await readFile(filePath, 'utf8');
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    throw new Error(`No paths found in list file: ${filePath}`);
  }

  const allResolved: string[] = [];

  for (const line of lines) {
    const resolved = await resolveFilePaths(line);

    allResolved.push(...resolved);
  }

  return allResolved;
};

export const resolveFilePaths = async (pattern: string): Promise<string[]> => {
  if (isS3Uri(pattern)) {
    return [pattern];
  }

  if (!hasGlobCharacters(pattern)) {
    const resolvedPath = path.resolve(pattern);

    try {
      const stats = await stat(resolvedPath);

      if (stats.isDirectory()) {
        return resolveDirectory(resolvedPath);
      }
    } catch {
      // File doesn't exist yet or can't be accessed — fall through
    }

    if (pattern.endsWith('.txt')) {
      return resolveListFile(resolvedPath);
    }

    return [resolvedPath];
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
