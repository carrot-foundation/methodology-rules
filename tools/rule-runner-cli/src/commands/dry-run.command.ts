import { handleCommandError } from '@carrot-fndn/shared/cli';
import { Argument, Command, Option } from '@commander-js/extra-typings';

import { handleDryRun } from './dry-run.handler';

export interface DryRunOptions {
  allRules: boolean;
  cache: boolean;
  config?: string | undefined;
  debug: boolean;
  documentId: string;
  envFile?: string | undefined;
  json: boolean;
  methodologySlug: string;
  ruleSlug?: string | undefined;
  rulesScope: string;
  smaugUrl?: string | undefined;
}

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
    ).makeOptionMandatory(),
  )
  .addOption(
    new Option(
      '-d, --document-id <id>',
      'Mass-ID document ID (Palantir document ID)',
    ).makeOptionMandatory(),
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
    new Option('--env-file <path>', 'Path to .env file').default(
      '.env-files/.env.test',
    ),
  )
  .option('--debug', 'Show detailed output', false)
  .option('--json', 'Output as JSON', false)
  .option('--no-cache', 'Disable textract cache')
  .action(async (processorPath: string | undefined, options: DryRunOptions) => {
    try {
      if (!processorPath && !options.allRules) {
        throw new Error(
          'Either provide a <processor-path> or use --all-rules to run all rules',
        );
      }

      await handleDryRun(processorPath, options);
    } catch (error: unknown) {
      handleCommandError(error, { verbose: options.debug });
    }
  });
