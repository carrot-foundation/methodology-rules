import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { emitEventData } from './generate.handler';
import { MASS_ID_CATALOG } from './mass-id-catalog';
import { toMethodologyFiles } from './mass-id-catalog.projections';

const sortAlphabetically = (left: string, right: string): number =>
  left.localeCompare(right);

const EXPECTED_FILES = [...toMethodologyFiles(MASS_ID_CATALOG).keys()].toSorted(
  sortAlphabetically,
);

const readTree = async (root: string): Promise<Map<string, string>> => {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const relativePaths = entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(root, path.join(entry.parentPath, entry.name)),
    )
    .toSorted(sortAlphabetically);

  return new Map(
    await Promise.all(
      relativePaths.map(
        async (relativePath): Promise<[string, string]> => [
          relativePath,
          await readFile(path.join(root, relativePath), 'utf8'),
        ],
      ),
    ),
  );
};

describe('emitEventData', () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), 'mass-id-generator-'),
    );
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { force: true, recursive: true });
  });

  it('should write every projected file for each methodology', async () => {
    const outputDirectory = path.join(temporaryDirectory, 'event-data');

    await emitEventData(outputDirectory);

    const recyclingTree = await readTree(
      path.join(outputDirectory, 'bold-recycling'),
    );
    const carbonTree = await readTree(
      path.join(outputDirectory, 'bold-carbon'),
    );

    const methodologyDirectories = await readdir(outputDirectory);

    expect([...recyclingTree.keys()]).toStrictEqual(EXPECTED_FILES);
    expect(carbonTree).toStrictEqual(recyclingTree);
    expect(methodologyDirectories.toSorted(sortAlphabetically)).toStrictEqual([
      'bold-carbon',
      'bold-recycling',
    ]);
  });

  it('should write two-space JSON with a trailing newline', async () => {
    await emitEventData(temporaryDirectory);

    await expect(
      readFile(
        path.join(
          temporaryDirectory,
          'bold-recycling/events/actor-integrator/payload.json',
        ),
        'utf8',
      ),
    ).resolves.toBe(
      [
        '{',
        '  "externalCreatedAt": "2024-12-05T11:02:47Z",',
        '  "isPublic": true,',
        '  "preserveSensitiveData": false,',
        '  "addressId": "00000000-0000-4000-9000-00000000000e",',
        '  "label": "Integrator",',
        '  "name": "ACTOR",',
        '  "participantId": "00000000-0000-4000-8000-00000000000e"',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('should produce identical bytes on a second run', async () => {
    const firstDirectory = path.join(temporaryDirectory, 'first');
    const secondDirectory = path.join(temporaryDirectory, 'second');

    await emitEventData(firstDirectory);
    await emitEventData(secondDirectory);

    expect(await readTree(secondDirectory)).toStrictEqual(
      await readTree(firstDirectory),
    );
  });

  it('should reject when the output path cannot be created', async () => {
    const blockingFile = path.join(temporaryDirectory, 'not-a-directory');

    await writeFile(blockingFile, '');

    await expect(
      emitEventData(path.join(blockingFile, 'event-data')),
    ).rejects.toThrow();
  });
});
