import { formatAsJson } from '@carrot-fndn/shared/cli';
import { BoldMethodologySlug } from '@carrot-fndn/shared/methodologies/bold/types';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { MASS_ID_CATALOG } from './mass-id-catalog';
import { toMethodologyFiles } from './mass-id-catalog.projections';

export const emitEventData = async (outputDirectory: string): Promise<void> => {
  const methodologyFiles = [...toMethodologyFiles(MASS_ID_CATALOG)];

  await Promise.all(
    Object.values(BoldMethodologySlug).flatMap((methodologySlug) =>
      methodologyFiles.map(async ([relativePath, artifact]) => {
        const filePath = path.join(
          outputDirectory,
          methodologySlug,
          relativePath,
        );

        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, `${formatAsJson(artifact)}\n`, 'utf8');
      }),
    ),
  );
};
