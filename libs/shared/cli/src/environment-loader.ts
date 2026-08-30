import dotenv from 'dotenv';
import path from 'node:path';

const DEFAULT_ENV_FILE = '.env-files/.env.test';

interface LoadEnvironmentOptions {
  override?: boolean;
}

export const loadEnvironment = (
  environmentFile?: string,
  options: LoadEnvironmentOptions = {},
): void => {
  const environmentPath = path.resolve(
    process.cwd(),
    environmentFile ?? DEFAULT_ENV_FILE,
  );

  dotenv.config({ override: options.override ?? false, path: environmentPath });
};
