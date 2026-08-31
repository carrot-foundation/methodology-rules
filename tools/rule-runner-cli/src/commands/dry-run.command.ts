import { handleCommandError } from '@carrot-fndn/shared/cli';
import { type DataSetName, DataSetNameSchema } from '@carrot-fndn/shared/types';
import {
  Argument,
  Command,
  InvalidArgumentError,
  Option,
} from '@commander-js/extra-typings';
import path from 'node:path';

import { handleDryRunBatch } from './dry-run-batch.handler';
import { handleDryRun } from './dry-run.handler';

export interface DryRunOptions {
  allRules: boolean;
  cache: boolean;
  concurrency: number;
  config?: string | undefined;
  dataSetName?: DataSetName | undefined;
  debug: boolean;
  documentId?: string | undefined;
  envFile?: string | undefined;
  inputFile?: string | undefined;
  json: boolean;
  methodologySlug?: string | undefined;
  ruleSlug?: string | undefined;
  rulesScope: string;
  smaugUrl?: string | undefined;
}

export type DryRunSelection =
  | {
      allRules: boolean;
      methodologySlug: string;
      mode: 'registered';
      processorPath?: string | undefined;
      ruleSlug?: string | undefined;
      rulesScope: string;
    }
  | {
      dataSetName: DataSetName;
      mode: 'local';
      processorPath: string;
    };

const parseConcurrency = (value: string): number => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    throw new InvalidArgumentError('Must be a positive integer.');
  }

  return parsed;
};

export const parseDataSetName = (value: string): DataSetName => {
  const result = DataSetNameSchema.safeParse(value);

  if (!result.success) {
    throw new InvalidArgumentError(
      '--data-set-name must be one of PROD, PROD_SIMULATION, TEST.',
    );
  }

  return result.data;
};

const LOCAL_ONLY_FORBIDDEN_OPTION_KEYS = [
  'methodologySlug',
  'rulesScope',
  'ruleSlug',
  'allRules',
  'config',
] as const;

type OptionValueSourceReader = Pick<Command, 'getOptionValueSource'>;

const formatOptionFlag = (optionKey: string): string =>
  `--${optionKey.replaceAll(
    /[A-Z]/g,
    (character) => `-${character.toLowerCase()}`,
  )}`;

const assertNoExplicitOptions = (
  command: OptionValueSourceReader,
  optionKeys: readonly string[],
  modeDescription: string,
): void => {
  for (const optionKey of optionKeys) {
    if (command.getOptionValueSource(optionKey) === 'cli') {
      throw new Error(
        `${formatOptionFlag(optionKey)} cannot be used ${modeDescription}`,
      );
    }
  }
};

export const createDryRunSelection = (
  processorPath: string | undefined,
  options: DryRunOptions,
  command: OptionValueSourceReader,
): DryRunSelection => {
  if (processorPath && options.dataSetName) {
    assertNoExplicitOptions(
      command,
      LOCAL_ONLY_FORBIDDEN_OPTION_KEYS,
      'with an explicit processor path',
    );

    return {
      dataSetName: options.dataSetName,
      mode: 'local',
      processorPath,
    };
  }

  assertNoExplicitOptions(command, ['dataSetName'], 'in registered mode');

  if (processorPath && command.getOptionValueSource('allRules') === 'cli') {
    throw new Error(
      '--all-rules cannot be used with an explicit processor path',
    );
  }

  if (
    processorPath &&
    command.getOptionValueSource('methodologySlug') !== 'cli'
  ) {
    throw new Error(
      'Explicit processor paths require --data-set-name for local mode or --methodology-slug for registered mode.',
    );
  }

  if (!processorPath && !options.allRules) {
    throw new Error(
      'Either provide a <processor-path> or use --all-rules to run all rules',
    );
  }

  if (!options.methodologySlug) {
    throw new Error('Registered mode requires --methodology-slug (-m).');
  }

  return {
    allRules: options.allRules,
    methodologySlug: options.methodologySlug,
    mode: 'registered',
    processorPath,
    ruleSlug:
      options.ruleSlug ?? (processorPath && path.basename(processorPath)),
    rulesScope: options.rulesScope,
  };
};

export const dryRunCommand = new Command('dry-run')
  .description(
    'Run rule processors against an un-audited document (prepares S3 data via Smaug)',
  )
  .addArgument(
    new Argument(
      '[processor-path]',
      'Path to rule processor directory (optional if --all-rules)',
    ),
  )
  .addOption(
    new Option(
      '-m, --methodology-slug <slug>',
      'Methodology slug (e.g., bold-carbon-organic)',
    ),
  )
  .addOption(new Option('-d, --document-id <id>', 'MassID document ID'))
  .addOption(
    new Option(
      '--data-set-name <name>',
      'Document dataset for explicit local mode (PROD, PROD_SIMULATION, TEST)',
    ).argParser(parseDataSetName),
  )
  .addOption(
    new Option(
      '-s, --rules-scope <scope>',
      'Rules scope (MassID, Credit Order, RecycledID, GasID)',
    ).default('MassID'),
  )
  .addOption(new Option('--rule-slug <slug>', 'Run only this specific rule'))
  .addOption(
    new Option(
      '--smaug-url <url>',
      'Smaug API URL (default: AUDIT_URL env var)',
    ),
  )
  .addOption(
    new Option('--all-rules', 'Run all rules for the scope').default(false),
  )
  .addOption(new Option('--config <json>', 'Processor config as JSON string'))
  .addOption(
    new Option(
      '--input-file <path>',
      'JSON file with array of document IDs for batch processing',
    ),
  )
  .addOption(
    new Option(
      '--concurrency <n>',
      'Number of parallel documents in batch mode',
    )
      .default(5)
      .argParser(parseConcurrency),
  )
  .addOption(
    new Option('--env-file <path>', 'Path to .env file').default(
      '.env-files/.env.test',
    ),
  )
  .option('--debug', 'Show detailed output', false)
  .option('--json', 'Output as JSON', false)
  .option('--no-cache', 'Disable textract cache')
  .action(
    async (
      processorPath: string | undefined,
      options: DryRunOptions,
      command,
    ) => {
      try {
        const selection = createDryRunSelection(
          processorPath,
          options,
          command,
        );

        if (options.inputFile) {
          await handleDryRunBatch(selection, options);
        } else {
          const { documentId } = options;

          if (!documentId) {
            throw new Error(
              'Single-document mode requires --document-id (-d). Use --input-file for batch processing.',
            );
          }

          await handleDryRun(selection, { ...options, documentId });
        }
      } catch (error: unknown) {
        handleCommandError(error, { verbose: options.debug });
      }
    },
  );
