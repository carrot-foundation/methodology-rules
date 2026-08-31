import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { loadLocalRuleModule } from './processor-loader';

const repositoryRoot = path.resolve(process.cwd(), '../..');
const privacyFlagsProcessorPath = path.join(
  repositoryRoot,
  'libs/methodologies/bold/rule-processors/mass-id/privacy-flags',
);
const privacyFlagsRuleDefinitionPath = path.join(
  privacyFlagsProcessorPath,
  'src/privacy-flags.rule-definition.ts',
);
const liveQueryProcessorPath = path.join(
  repositoryRoot,
  'libs/methodologies/bold/rule-processors/mass-id/waste-mass-is-unique',
);
const attachmentQueryProcessorPath = path.join(
  repositoryRoot,
  'libs/methodologies/bold/rule-processors/mass-id/weighing',
);
const parameterizedConstructorSentinel =
  'processorLoaderParameterizedConstructorInvoked';

const haulerProcessorSourcePath = path.join(
  repositoryRoot,
  'libs/methodologies/bold/rule-processors/mass-id/hauler-identification/src/hauler-identification.processor.ts',
);

const validRuleDefinitionSource = `
export const ruleDefinition = {
  description: 'A test rule definition.',
  events: [],
  input: {},
  name: 'Test rule',
  slug: 'test-rule',
  version: '1.0.0',
};
`;

interface FixtureOptions {
  duplicateRuleDefinition?: boolean;
  processorFileName?: string;
  processorSource?: string;
  ruleDefinitionFileName?: string;
  ruleDefinitionSource?: null | string;
  rulesScopeDirectory?: string;
}

const createProcessorFixture = async ({
  duplicateRuleDefinition = false,
  processorFileName = 'test-rule.processor.ts',
  processorSource = `export { HaulerIdentificationProcessor } from '${haulerProcessorSourcePath}';`,
  ruleDefinitionFileName = 'test-rule.rule-definition.ts',
  ruleDefinitionSource = validRuleDefinitionSource,
  rulesScopeDirectory = 'mass-id',
}: FixtureOptions = {}): Promise<string> => {
  const fixtureDirectory = await mkdtemp(
    path.join(os.tmpdir(), 'processor-loader-'),
  );
  const processorDirectory = path.join(
    fixtureDirectory,
    'rule-processors',
    rulesScopeDirectory,
    'test-rule',
  );
  const sourceDirectory = path.join(processorDirectory, 'src');

  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(
    path.join(sourceDirectory, processorFileName),
    processorSource,
  );

  if (ruleDefinitionSource !== null) {
    await writeFile(
      path.join(sourceDirectory, ruleDefinitionFileName),
      ruleDefinitionSource,
    );
  }

  if (duplicateRuleDefinition) {
    await writeFile(
      path.join(sourceDirectory, 'duplicate.rule-definition.ts'),
      validRuleDefinitionSource,
    );
  }

  return processorDirectory;
};

describe('loadLocalRuleModule', () => {
  const fixtureDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      fixtureDirectories
        .splice(0)
        .map((fixtureDirectory) =>
          rm(fixtureDirectory, { force: true, recursive: true }),
        ),
    );

    Reflect.deleteProperty(globalThis, parameterizedConstructorSentinel);
  });

  const createFixture = async (options?: FixtureOptions): Promise<string> => {
    const processorDirectory = await createProcessorFixture(options);

    fixtureDirectories.push(path.resolve(processorDirectory, '..', '..', '..'));

    return processorDirectory;
  };

  it('should load the real privacy-flags MassID processor and its colocated definition', async () => {
    await expect(
      loadLocalRuleModule(privacyFlagsProcessorPath),
    ).resolves.toMatchObject({
      Processor: expect.any(Function),
      ruleDefinition: {
        description: expect.any(String),
        events: expect.any(Array),
        input: {},
        name: expect.any(String),
        slug: 'privacy-flags',
        version: expect.any(String),
      },
      rulesScope: 'MassID',
    });
  });

  it('should preserve the imported privacy-flags definition across repeated cached loads', async () => {
    const { ruleDefinition: importedRuleDefinition } = await import(
      privacyFlagsRuleDefinitionPath
    );
    const expectedDefinition = structuredClone(importedRuleDefinition);

    Object.freeze(importedRuleDefinition.events);
    Object.freeze(importedRuleDefinition);

    const firstLoad = await loadLocalRuleModule(privacyFlagsProcessorPath);
    const secondLoad = await loadLocalRuleModule(privacyFlagsProcessorPath);

    expect(firstLoad.ruleDefinition).toEqual(expectedDefinition);
    expect(secondLoad.ruleDefinition).toEqual(expectedDefinition);
    expect(importedRuleDefinition).toEqual(expectedDefinition);
  });

  it('should reject a processor outside the MassID scope', async () => {
    const processorDirectory = await createFixture({
      rulesScopeDirectory: 'credit-order',
    });

    await expect(loadLocalRuleModule(processorDirectory)).rejects.toThrow(
      'MassID',
    );
  });

  it('should reject a zero-argument processor without declared static input', async () => {
    await expect(loadLocalRuleModule(liveQueryProcessorPath)).rejects.toThrow(
      `Unsupported rule definition for ${liveQueryProcessorPath}. Local MassID processors must declare static input criteria.`,
    );
  });

  it('should reject weighing because its attachment input is not staged', async () => {
    await expect(
      loadLocalRuleModule(attachmentQueryProcessorPath),
    ).rejects.toThrow(
      `Unsupported rule definition for ${attachmentQueryProcessorPath}. Local MassID processors must declare static input criteria.`,
    );
  });

  it('should not construct a parameterized processor while rejecting it', async () => {
    Reflect.set(globalThis, parameterizedConstructorSentinel, false);

    const processorDirectory = await createFixture({
      processorSource: `
import { RuleDataProcessor } from '${path.join(repositoryRoot, 'libs/shared/app/types/src/app-context.ts')}';
import type { RuleInput, RuleOutput } from '${path.join(repositoryRoot, 'libs/shared/rule/types/src/rule.types.ts')}';

export class TestRuleProcessor extends RuleDataProcessor {
  constructor(requiredArgument: string) {
    super();
    Reflect.set(globalThis, '${parameterizedConstructorSentinel}', true);
    throw new Error('Parameterized fixture invoked.');
  }

  async process(_ruleInput: RuleInput): Promise<RuleOutput> {
    throw new Error('Not reached.');
  }
}
`,
    });

    await expect(loadLocalRuleModule(processorDirectory)).rejects.toThrow(
      `Unsupported processor constructor for ${processorDirectory}. Local MassID processors must not require constructor arguments.`,
    );
    expect(Reflect.get(globalThis, parameterizedConstructorSentinel)).toBe(
      false,
    );
  });

  it('should accept a processor whose only constructor argument is defaulted', async () => {
    const processorDirectory = await createFixture({
      processorSource: `
import { RuleDataProcessor } from '${path.join(repositoryRoot, 'libs/shared/app/types/src/app-context.ts')}';
import type { RuleInput, RuleOutput } from '${path.join(repositoryRoot, 'libs/shared/rule/types/src/rule.types.ts')}';

export class TestRuleProcessor extends RuleDataProcessor {
  constructor(configuration: Record<string, unknown> = {}) {
    super();
  }

  async process(_ruleInput: RuleInput): Promise<RuleOutput> {
    throw new Error('Not reached.');
  }
}
`,
    });

    await expect(
      loadLocalRuleModule(processorDirectory),
    ).resolves.toMatchObject({
      Processor: expect.any(Function),
      rulesScope: 'MassID',
    });
  });

  it('should reject a processor without a colocated rule definition', async () => {
    const processorDirectory = await createFixture({
      ruleDefinitionSource: null,
    });

    await expect(loadLocalRuleModule(processorDirectory)).rejects.toThrow(
      'rule definition',
    );
  });

  it('should reject duplicate colocated rule definitions', async () => {
    const processorDirectory = await createFixture({
      duplicateRuleDefinition: true,
    });

    await expect(loadLocalRuleModule(processorDirectory)).rejects.toThrow(
      'exactly one rule definition',
    );
  });

  it('should reject a processor file that is not named after its directory', async () => {
    const processorDirectory = await createFixture({
      processorFileName: 'other.processor.ts',
    });

    await expect(loadLocalRuleModule(processorDirectory)).rejects.toThrow(
      'test-rule.processor.ts',
    );
  });

  it('should reject a rule definition file that is not named after its directory', async () => {
    const processorDirectory = await createFixture({
      ruleDefinitionFileName: 'other.rule-definition.ts',
    });

    await expect(loadLocalRuleModule(processorDirectory)).rejects.toThrow(
      'test-rule.rule-definition.ts',
    );
  });

  it('should reject a malformed colocated rule definition export', async () => {
    const processorDirectory = await createFixture({
      ruleDefinitionSource: 'export const ruleDefinition = { events: [] };',
    });

    await expect(loadLocalRuleModule(processorDirectory)).rejects.toThrow(
      'Invalid rule definition',
    );
  });

  it('should reject a rule definition without declared static input', async () => {
    const processorDirectory = await createFixture({
      ruleDefinitionSource: `
export const ruleDefinition = {
  description: 'A test rule definition.',
  events: [],
  name: 'Test rule',
  slug: 'test-rule',
  version: '1.0.0',
};
`,
    });

    await expect(loadLocalRuleModule(processorDirectory)).rejects.toThrow(
      `Unsupported rule definition for ${processorDirectory}. Local MassID processors must declare static input criteria.`,
    );
  });

  it.each([
    'input: [],',
    "input: { unknown: 'value' },",
    "input: { parentDocument: { omit: 'true' } },",
    'input: { parentDocument: { relatedDocuments: [{ category: 42 }] } },',
  ])('should reject invalid document query criteria (%s)', async (input) => {
    const processorDirectory = await createFixture({
      ruleDefinitionSource: `
export const ruleDefinition = {
  description: 'A test rule definition.',
  events: [],
  ${input}
  name: 'Test rule',
  slug: 'test-rule',
  version: '1.0.0',
};
`,
    });

    await expect(loadLocalRuleModule(processorDirectory)).rejects.toThrow(
      'Invalid rule definition',
    );
  });
});
