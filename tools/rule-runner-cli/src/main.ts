import { loadEnvironment, runProgram } from '@carrot-fndn/shared/cli';
import { Command } from '@commander-js/extra-typings';

// Load environment BEFORE importing modules that read env vars at import time
// (e.g., DocumentRepository captures DOCUMENT_BUCKET_NAME in its constructor)
loadEnvironment();

void (async () => {
  const { runCommand } = await import('./commands/run.command');
  const { dryRunCommand } = await import('./commands/dry-run.command');

  const program = new Command('rule-runner')
    .description('Run rule processors locally against real S3 data')
    .version('1.0.0');

  program.addCommand(runCommand, { isDefault: true });
  program.addCommand(dryRunCommand);

  await runProgram(program);
})();
