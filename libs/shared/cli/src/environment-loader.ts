import dotenv from 'dotenv';
import path from 'node:path';

const DEFAULT_ENV_FILE = '.env-files/.env.test';

export const loadEnvironment = (environmentFile?: string): void => {
  const environmentPath = path.resolve(
    process.cwd(),
    environmentFile ?? DEFAULT_ENV_FILE,
  );

  dotenv.config({ path: environmentPath });
};
