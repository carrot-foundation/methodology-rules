import dotenv from 'dotenv';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { loadEnvironment } from './environment-loader';

describe('loadEnvironment', () => {
  const originalAuditUrl = process.env['AUDIT_URL'];
  let environmentDirectory: string;
  let environmentFile: string;

  beforeAll(async () => {
    environmentDirectory = await mkdtemp(
      path.join(tmpdir(), 'environment-loader-'),
    );

    environmentFile = path.join(environmentDirectory, '.env');
    await writeFile(environmentFile, 'AUDIT_URL=https://file.example\n');
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalAuditUrl === undefined) {
      delete process.env['AUDIT_URL'];

      return;
    }

    process.env['AUDIT_URL'] = originalAuditUrl;
  });

  afterAll(async () => {
    await rm(environmentDirectory, { force: true, recursive: true });
  });

  it('should load default env file', () => {
    const config = vi.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

    loadEnvironment();

    expect(config).toHaveBeenCalledWith({
      override: false,
      path: expect.stringContaining('.env-files/.env.test'),
    });
  });

  it('should load custom env file when provided', () => {
    const config = vi.spyOn(dotenv, 'config').mockReturnValue({ parsed: {} });

    loadEnvironment(environmentFile);

    expect(config).toHaveBeenCalledWith({
      override: false,
      path: environmentFile,
    });
  });

  it('should preserve an explicit shell value', () => {
    process.env['AUDIT_URL'] = 'https://shell.example';

    loadEnvironment(environmentFile);

    expect(process.env['AUDIT_URL']).toBe('https://shell.example');
  });

  it('should override a shell value when requested', () => {
    process.env['AUDIT_URL'] = 'https://shell.example';

    loadEnvironment(environmentFile, { override: true });

    expect(process.env['AUDIT_URL']).toBe('https://file.example');
  });
});
