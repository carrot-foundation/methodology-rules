import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { resolveFilePaths } from './file-resolver';

describe('resolveFilePaths', () => {
  const testDirectory = path.join(tmpdir(), 'file-resolver-test');
  const subDirectory = path.join(testDirectory, 'subdir');
  const emptyDirectory = path.join(testDirectory, 'empty');
  const listFilePath = path.join(testDirectory, 'paths.txt');
  const mixedListFilePath = path.join(testDirectory, 'mixed-paths.txt');
  const emptyListFilePath = path.join(testDirectory, 'empty-list.txt');

  beforeAll(() => {
    if (!existsSync(testDirectory)) {
      mkdirSync(testDirectory, { recursive: true });
    }

    mkdirSync(subDirectory, { recursive: true });
    mkdirSync(emptyDirectory, { recursive: true });

    writeFileSync(path.join(testDirectory, 'file-a.pdf'), '');
    writeFileSync(path.join(testDirectory, 'file-b.pdf'), '');
    writeFileSync(path.join(testDirectory, 'file-c.txt'), '');
    writeFileSync(path.join(subDirectory, 'nested.pdf'), '');
    writeFileSync(path.join(subDirectory, 'image.png'), '');

    writeFileSync(
      listFilePath,
      [
        path.join(testDirectory, 'file-a.pdf'),
        path.join(testDirectory, 'file-b.pdf'),
      ].join('\n'),
    );

    writeFileSync(emptyListFilePath, '# only comments\n\n');

    writeFileSync(
      mixedListFilePath,
      [
        's3://bucket/remote-file.pdf',
        path.join(testDirectory, 'file-a.pdf'),
        '',
        '# this is a comment',
        path.join(testDirectory, 'file-b.pdf'),
      ].join('\n'),
    );
  });

  afterAll(() => {
    rmSync(testDirectory, { force: true, recursive: true });
  });

  it('should return S3 URIs as-is without glob expansion', async () => {
    const result = await resolveFilePaths('s3://bucket/key.pdf');

    expect(result).toStrictEqual(['s3://bucket/key.pdf']);
  });

  it('should resolve a single local path to an absolute path', async () => {
    const filePath = path.join(testDirectory, 'file-a.pdf');
    const result = await resolveFilePaths(filePath);

    expect(result).toStrictEqual([filePath]);
  });

  it('should expand glob patterns and return sorted results', async () => {
    const result = await resolveFilePaths(path.join(testDirectory, '*.pdf'));

    expect(result).toStrictEqual([
      path.join(testDirectory, 'file-a.pdf'),
      path.join(testDirectory, 'file-b.pdf'),
    ]);
  });

  it('should throw when glob matches no files', async () => {
    await expect(
      resolveFilePaths(path.join(testDirectory, '*.xyz')),
    ).rejects.toThrow('No files matched the pattern');
  });

  describe('directory input', () => {
    it('should resolve directory to supported files recursively (sorted)', async () => {
      const result = await resolveFilePaths(testDirectory);

      const supportedFiles = result.filter((f) => !f.endsWith('.txt'));

      expect(supportedFiles.length).toBeGreaterThanOrEqual(4);
      expect(supportedFiles).toStrictEqual(
        [...supportedFiles].sort((a, b) => a.localeCompare(b)),
      );
    });

    it('should include nested files from subdirectories', async () => {
      const result = await resolveFilePaths(testDirectory);

      expect(result).toContain(path.join(subDirectory, 'nested.pdf'));
      expect(result).toContain(path.join(subDirectory, 'image.png'));
    });

    it('should throw when directory has no supported files', async () => {
      await expect(resolveFilePaths(emptyDirectory)).rejects.toThrow(
        'No supported files found in directory',
      );
    });
  });

  describe('.txt list file input', () => {
    it('should resolve each line in a .txt file', async () => {
      const result = await resolveFilePaths(listFilePath);

      expect(result).toStrictEqual([
        path.join(testDirectory, 'file-a.pdf'),
        path.join(testDirectory, 'file-b.pdf'),
      ]);
    });

    it('should throw when .txt file has no valid paths', async () => {
      await expect(resolveFilePaths(emptyListFilePath)).rejects.toThrow(
        'No paths found in list file',
      );
    });

    it('should handle mixed S3 and local paths, skip comments and empty lines', async () => {
      const result = await resolveFilePaths(mixedListFilePath);

      expect(result).toStrictEqual([
        's3://bucket/remote-file.pdf',
        path.join(testDirectory, 'file-a.pdf'),
        path.join(testDirectory, 'file-b.pdf'),
      ]);
    });
  });
});
