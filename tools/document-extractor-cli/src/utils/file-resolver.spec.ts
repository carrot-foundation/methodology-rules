import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { resolveFilePaths } from './file-resolver';

describe('resolveFilePaths', () => {
  const testDirectory = path.join(tmpdir(), 'file-resolver-test');

  beforeAll(() => {
    if (!existsSync(testDirectory)) {
      mkdirSync(testDirectory, { recursive: true });
    }

    writeFileSync(path.join(testDirectory, 'file-a.pdf'), '');
    writeFileSync(path.join(testDirectory, 'file-b.pdf'), '');
    writeFileSync(path.join(testDirectory, 'file-c.txt'), '');
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
});
