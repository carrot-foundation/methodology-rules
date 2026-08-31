import { loadEnvironment } from '@carrot-fndn/shared/env';

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
      const value = argument.slice(optionWithEquals.length);

      if (value.length === 0) {
        throw new Error(`${optionName} requires a path`);
      }

      optionValue = value;
      continue;
    }

    if (argument !== optionName) {
      continue;
    }

    const nextArgument = arguments_.at(index + 1);

    if (nextArgument === undefined || nextArgument.startsWith('-')) {
      throw new Error(`${optionName} requires a path`);
    }

    optionValue = nextArgument;
    index += 1;
  }

  return optionValue;
};

const environmentFile = readOptionValue(process.argv, '--env-file');

loadEnvironment(environmentFile, { override: false });

void (async () => {
  const { Command } = await import('@commander-js/extra-typings');
  const { runProgram } = await import('@carrot-fndn/shared/cli');
  const { runCommand } = await import('./commands/run.command');
  const { dryRunCommand } = await import('./commands/dry-run.command');

  const program = new Command('rule-runner')
    .description('Run rule processors locally against real S3 data')
    .version('1.0.0');

  program.addCommand(runCommand, { isDefault: true });
  program.addCommand(dryRunCommand);

  await runProgram(program);
})();
