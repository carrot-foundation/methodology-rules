import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { loadEnvironment } from './environment-loader';

describe('loadEnvironment', () => {
  const originalAuditUrl = process.env['AUDIT_URL'];
  const originalDotenvConfigDebug = process.env['DOTENV_CONFIG_DEBUG'];
  const originalDotenvKey = process.env['DOTENV_KEY'];
  let environmentDirectory: string;
  let environmentFile: string;
  let fileAuditUrl: string;
  let missingEnvironmentFile: string;

  beforeAll(async () => {
    environmentDirectory = await mkdtemp(
      path.join(tmpdir(), 'environment-loader-'),
    );
    environmentFile = path.join(environmentDirectory, '.env');
    missingEnvironmentFile = path.join(environmentDirectory, 'missing.env');
    fileAuditUrl = faker.internet.url();
    await writeFile(environmentFile, `AUDIT_URL=${fileAuditUrl}\n`);
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalAuditUrl === undefined) {
      delete process.env['AUDIT_URL'];
    } else {
      process.env['AUDIT_URL'] = originalAuditUrl;
    }

    if (originalDotenvConfigDebug === undefined) {
      delete process.env['DOTENV_CONFIG_DEBUG'];
    } else {
      process.env['DOTENV_CONFIG_DEBUG'] = originalDotenvConfigDebug;
    }

    if (originalDotenvKey === undefined) {
      delete process.env['DOTENV_KEY'];
    } else {
      process.env['DOTENV_KEY'] = originalDotenvKey;
    }
  });

  afterAll(async () => {
    await rm(environmentDirectory, { force: true, recursive: true });
  });

  it('should load the default environment file quietly', () => {
    const config = vi
      .spyOn(dotenv, 'configDotenv')
      .mockReturnValue({ parsed: {} });

    loadEnvironment();

    expect(config).toHaveBeenCalledWith({
      override: false,
      path: expect.stringContaining('.env-files/.env.test'),
      processEnv: {
        DOTENV_CONFIG_DEBUG: 'false',
        DOTENV_CONFIG_QUIET: 'true',
      },
      quiet: true,
    });
  });

  it('should load a custom environment file quietly', () => {
    const config = vi
      .spyOn(dotenv, 'configDotenv')
      .mockReturnValue({ parsed: {} });

    loadEnvironment(environmentFile);

    expect(config).toHaveBeenCalledWith({
      override: false,
      path: environmentFile,
      processEnv: {
        DOTENV_CONFIG_DEBUG: 'false',
        DOTENV_CONFIG_QUIET: 'true',
      },
      quiet: true,
    });
  });

  it('should preserve an explicit shell value', () => {
    const shellAuditUrl = faker.internet.url();

    process.env['AUDIT_URL'] = shellAuditUrl;

    loadEnvironment(environmentFile);

    expect(process.env['AUDIT_URL']).toBe(shellAuditUrl);
  });

  it('should override a shell value when requested', () => {
    process.env['AUDIT_URL'] = faker.internet.url();

    loadEnvironment(environmentFile, { override: true });

    expect(process.env['AUDIT_URL']).toBe(fileAuditUrl);
  });

  it('should reject a missing requested environment file', () => {
    expect(() => loadEnvironment(missingEnvironmentFile)).toThrow(
      missingEnvironmentFile,
    );
  });

  it('should reject a dotenv response without parsed environment values', () => {
    vi.spyOn(dotenv, 'configDotenv').mockReturnValue({});

    expect(() => loadEnvironment(environmentFile)).toThrow(environmentFile);
  });

  it.each(['a missing file', 'a directory'])(
    'should fail quietly when %s cannot be read as an environment file',
    (unreadablePath) => {
      const unreadableEnvironmentFile =
        unreadablePath === 'a missing file'
          ? missingEnvironmentFile
          : environmentDirectory;
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      expect(() => loadEnvironment(unreadableEnvironmentFile)).toThrow(
        unreadableEnvironmentFile,
      );
      expect(log).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['debug', 'DOTENV_CONFIG_DEBUG', 'true'],
    ['vault key', 'DOTENV_KEY', 'review-key'],
  ])(
    'should not print diagnostics when inherited dotenv %s control is set',
    (_control, environmentVariable, value) => {
      process.env[environmentVariable] = value;
      const error = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      loadEnvironment(environmentFile);

      expect(error).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    },
  );
});
