import dotenv from 'dotenv';
import path from 'node:path';

const DEFAULT_ENV_FILE = '.env-files/.env.test';

export interface LoadEnvironmentOptions {
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
  const dotenvProcessEnvironment = {
    DOTENV_CONFIG_DEBUG: 'false',
    DOTENV_CONFIG_QUIET: 'true',
  };
  const result = dotenv.configDotenv({
    override: false,
    path: environmentPath,
    processEnv: dotenvProcessEnvironment,
    quiet: true,
  });

  if (result.error !== undefined) {
    throw new Error(`Cannot load environment file ${environmentPath}`, {
      cause: result.error,
    });
  }

  if (result.parsed === undefined) {
    throw new Error(`Cannot load environment file ${environmentPath}`);
  }

  dotenv.populate(process.env, result.parsed, {
    override: options.override ?? false,
  });
};
