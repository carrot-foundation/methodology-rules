import { loadEnvironment, runProgram } from '@carrot-fndn/shared/cli';
import { Command } from '@commander-js/extra-typings';

const readOptionValue = (
  arguments_: readonly string[],
  optionName: string,
): string | undefined => {
  const optionWithEquals = `${optionName}=`;
  let optionValue: string | undefined;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_.at(index);

    if (argument === undefined) {
      continue;
    }

    if (argument === '--') {
      break;
    }

    if (argument.startsWith(optionWithEquals)) {
      optionValue = argument.slice(optionWithEquals.length);
      continue;
    }

    if (argument !== optionName) {
      continue;
    }

    const nextArgument = arguments_.at(index + 1);

    if (nextArgument === undefined) {
      optionValue = undefined;
      continue;
    }

    optionValue = nextArgument;
    index += 1;
  }

  return optionValue;
};

const environmentFile = readOptionValue(process.argv, '--env-file');

loadEnvironment(environmentFile, { override: false });

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
