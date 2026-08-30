import type { DocumentQueryCriteria } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { logger } from '@carrot-fndn/shared/helpers';
import fs from 'node:fs';
import path from 'node:path';

export interface LocalRuleModule {
  Processor: RuleProcessorConstructor;
  ruleDefinition: BaseRuleDefinition<DocumentQueryCriteria>;
  rulesScope: 'MassID';
}

export type RuleProcessorConstructor = new () => RuleDataProcessor;

type DiscoveredRuleProcessorConstructor = new (
  config?: Record<string, unknown>,
) => RuleDataProcessor;

const isRuleDataProcessorClass = (
  value: unknown,
): value is DiscoveredRuleProcessorConstructor => {
  if (typeof value !== 'function') {
    return false;
  }

  let prototype: null | object = value.prototype as null | object;

  while (prototype !== null) {
    if (prototype === RuleDataProcessor.prototype) {
      return true;
    }

    prototype = Object.getPrototypeOf(prototype) as null | object;
  }

  return false;
};

const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;

const hasStringProperty = (value: object, property: string): boolean =>
  typeof Reflect.get(value, property) === 'string';

const hasStringArrayProperty = (value: object, property: string): boolean => {
  const propertyValue: unknown = Reflect.get(value, property);

  return (
    Array.isArray(propertyValue) &&
    propertyValue.every((element) => typeof element === 'string')
  );
};

const isRuleDefinition = (
  value: unknown,
): value is BaseRuleDefinition<DocumentQueryCriteria> => {
  if (!isObject(value)) {
    return false;
  }

  const input: unknown = Reflect.get(value, 'input');

  return (
    hasStringProperty(value, 'description') &&
    hasStringArrayProperty(value, 'events') &&
    (input === undefined || isObject(input)) &&
    hasStringProperty(value, 'name') &&
    hasStringProperty(value, 'slug') &&
    hasStringProperty(value, 'version')
  );
};

const resolveProcessorDirectory = (processorPath: string): string =>
  path.resolve(process.cwd(), processorPath);

const resolveProcessorSourceDirectory = (processorPath: string): string =>
  path.join(resolveProcessorDirectory(processorPath), 'src');

const loadProcessorClassFromFile = async (
  processorFile: string,
): Promise<DiscoveredRuleProcessorConstructor> => {
  logger.debug(`Loading processor from: ${processorFile}`);

  const module: Record<string, unknown> = (await import(
    processorFile
  )) as Record<string, unknown>;

  const ProcessorClass = Object.values(module).find((value) =>
    isRuleDataProcessorClass(value),
  );

  if (!ProcessorClass) {
    throw new Error(`No RuleDataProcessor subclass found in ${processorFile}`);
  }

  logger.debug(`Found processor class: ${ProcessorClass.name}`);

  return ProcessorClass;
};

const loadProcessorClass = async (
  processorPath: string,
): Promise<DiscoveredRuleProcessorConstructor> => {
  const absolutePath = resolveProcessorSourceDirectory(processorPath);

  const allFiles = await fs.promises.readdir(absolutePath);
  const files = allFiles.filter(
    (file) => file.endsWith('.processor.ts') && !file.endsWith('.spec.ts'),
  );

  if (files.length === 0) {
    throw new Error(
      `No processor file found in ${absolutePath}. Expected *.processor.ts`,
    );
  }

  const processorFile = path.join(absolutePath, files[0]!);

  return loadProcessorClassFromFile(processorFile);
};

const loadLocalProcessorClass = async (
  processorPath: string,
): Promise<DiscoveredRuleProcessorConstructor> => {
  const processorDirectory = resolveProcessorDirectory(processorPath);
  const sourceDirectory = resolveProcessorSourceDirectory(processorPath);
  const expectedProcessorFile = `${path.basename(processorDirectory)}.processor.ts`;
  const files = await fs.promises.readdir(sourceDirectory);

  if (!files.includes(expectedProcessorFile)) {
    throw new Error(
      `No processor file named ${expectedProcessorFile} found in ${sourceDirectory}.`,
    );
  }

  return loadProcessorClassFromFile(
    path.join(sourceDirectory, expectedProcessorFile),
  );
};

const resolveLocalRulesScope = (processorPath: string): 'MassID' => {
  const processorDirectory = resolveProcessorDirectory(processorPath);
  const scopeDirectory = path.dirname(processorDirectory);
  const ruleProcessorsDirectory = path.dirname(scopeDirectory);

  if (
    path.basename(ruleProcessorsDirectory) !== 'rule-processors' ||
    path.basename(scopeDirectory) !== 'mass-id'
  ) {
    throw new Error(
      `Unsupported local rule scope at ${processorDirectory}. Only MassID processors are supported.`,
    );
  }

  return 'MassID';
};

const loadRuleDefinition = async (
  processorPath: string,
): Promise<BaseRuleDefinition<DocumentQueryCriteria>> => {
  const processorDirectory = resolveProcessorDirectory(processorPath);
  const sourceDirectory = resolveProcessorSourceDirectory(processorPath);
  const files = await fs.promises.readdir(sourceDirectory);
  const ruleDefinitionFiles = files.filter((file) =>
    file.endsWith('.rule-definition.ts'),
  );
  const expectedRuleDefinitionFile = `${path.basename(processorDirectory)}.rule-definition.ts`;

  if (
    ruleDefinitionFiles.length !== 1 ||
    ruleDefinitionFiles[0] !== expectedRuleDefinitionFile
  ) {
    throw new Error(
      `Expected exactly one rule definition file named ${expectedRuleDefinitionFile} in ${sourceDirectory}. Found ${ruleDefinitionFiles.length}.`,
    );
  }

  const ruleDefinitionFile = path.join(sourceDirectory, ruleDefinitionFiles[0]);
  const module: Record<string, unknown> = (await import(
    ruleDefinitionFile
  )) as Record<string, unknown>;
  const ruleDefinition = module['ruleDefinition'];

  if (!isRuleDefinition(ruleDefinition)) {
    throw new Error(`Invalid rule definition export in ${ruleDefinitionFile}.`);
  }

  return ruleDefinition;
};

const isArgumentFreeRuleProcessorConstructor = (
  Processor: DiscoveredRuleProcessorConstructor,
): Processor is RuleProcessorConstructor => Processor.length === 0;

export const loadLocalRuleModule = async (
  processorPath: string,
): Promise<LocalRuleModule> => {
  const rulesScope = resolveLocalRulesScope(processorPath);
  const [Processor, ruleDefinition] = await Promise.all([
    loadLocalProcessorClass(processorPath),
    loadRuleDefinition(processorPath),
  ]);

  if (!isArgumentFreeRuleProcessorConstructor(Processor)) {
    throw new Error(
      `Unsupported processor constructor for ${processorPath}. Local MassID processors must not require constructor arguments.`,
    );
  }

  return { Processor, ruleDefinition, rulesScope };
};

export const loadProcessor = async (
  processorPath: string,
  config?: Record<string, unknown>,
): Promise<RuleDataProcessor> => {
  const ProcessorClass = await loadProcessorClass(processorPath);

  return new ProcessorClass(config);
};
