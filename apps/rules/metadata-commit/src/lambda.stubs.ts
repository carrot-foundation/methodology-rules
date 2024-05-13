import { random } from 'typia';

import type { Metadata } from './lambda.types';

export const stubEnvironmentVariables = (
  partialEnvironments?: NodeJS.ProcessEnv | Record<string, string>,
) => ({
  ENVIRONMENT: 'development',
  GH_OWNER: 'carrot-foundation',
  GH_REPO: 'audit-rules',
  REFERENCE_BRANCH: 'test/rules-metadata-commit',
  ...partialEnvironments,
});

export const stubS3ObjectMetadata = (
  partialData?: Partial<Metadata>,
): Metadata => ({
  ...random<Metadata>(),
  'rule-name': 'bold-mass-pick-up-geolocation-precision',
  ...partialData,
});
