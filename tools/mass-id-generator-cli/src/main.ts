import { handleCommandError, runProgram } from '@carrot-fndn/shared/cli';
import { Command } from '@commander-js/extra-typings';

import { emitEventData } from './generate.handler';

const program = new Command('mass-id-generator')
  .description('Emit the MassID event data the docs site syncs')
  .requiredOption(
    '--emit-to <directory>',
    'Directory to write the event data tree into',
  )
  .action(async ({ emitTo }) => {
    try {
      await emitEventData(emitTo);
    } catch (error) {
      handleCommandError(error, { verbose: true });
    }
  });

void runProgram(program);
