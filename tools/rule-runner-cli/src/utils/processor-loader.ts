import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { logger } from '@carrot-fndn/shared/helpers';
import fs from 'node:fs';
import path from 'node:path';

const isRuleDataProcessorClass = (
  value: unknown,
): value is new (config?: unknown) => RuleDataProcessor => {
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

export const loadProcessor = async (
  processorPath: string,
  config?: Record<string, unknown>,
): Promise<RuleDataProcessor> => {
  const absolutePath = path.resolve(process.cwd(), processorPath, 'src');

  const allFiles = await fs.promises.readdir(absolutePath);
  const files = allFiles.filter(
    (f) => f.endsWith('.processor.ts') && !f.endsWith('.spec.ts'),
  );

  if (files.length === 0) {
    throw new Error(
      `No processor file found in ${absolutePath}. Expected *.processor.ts`,
    );
  }

  const processorFile = path.join(absolutePath, files[0]!);

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

  return new ProcessorClass(config);
};
