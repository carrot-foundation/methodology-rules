import { Command } from '@commander-js/extra-typings';

const {
  importOrder,
  loadEnvironment,
  recordCommandImport,
  recordRuntimeImport,
  runProgram,
} = vi.hoisted(() => {
  const order: string[] = [];

  return {
    importOrder: order,
    loadEnvironment: vi.fn(
      (environmentFile: string, options?: { override?: boolean }) => {
        order.push(
          `environment:${environmentFile}:${String(options?.override)}`,
        );
      },
    ),
    recordCommandImport: (): void => {
      if (!order.includes('commands')) {
        order.push('commands');
      }
    },
    recordRuntimeImport: (): void => {
      order.push('runtime');
    },
    runProgram: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@carrot-fndn/shared/env', () => ({
  loadEnvironment,
}));

vi.mock('@carrot-fndn/shared/cli', () => ({
  get runProgram(): typeof runProgram {
    recordRuntimeImport();

    return runProgram;
  },
}));

vi.mock('./commands/run.command', () => ({
  get runCommand(): Command {
    recordCommandImport();

    return new Command('run');
  },
}));

vi.mock('./commands/dry-run.command', () => ({
  get dryRunCommand(): Command {
    recordCommandImport();

    return new Command('dry-run');
  },
}));

describe('rule runner bootstrap', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    importOrder.length = 0;
    loadEnvironment.mockClear();
    runProgram.mockClear();
    vi.resetModules();
    process.argv = ['node', 'rule-runner'];
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('should load the requested file before importing the command module', async () => {
    process.argv.push('--env-file', '.env-files/.env.custom');

    await import('./main');

    await vi.waitFor(() => {
      expect(importOrder).toEqual([
        'environment:.env-files/.env.custom:false',
        'runtime',
        'commands',
      ]);
    });
  });

  it('should load an environment file supplied with equals syntax', async () => {
    process.argv.push('--env-file=.env-files/.env.custom');

    await import('./main');

    await vi.waitFor(() => {
      expect(importOrder).toEqual([
        'environment:.env-files/.env.custom:false',
        'runtime',
        'commands',
      ]);
    });
  });

  it('should load the final repeated environment file', async () => {
    process.argv.push(
      '--env-file',
      '.env-files/.env.first',
      '--env-file',
      '.env-files/.env.custom',
    );

    await import('./main');

    await vi.waitFor(() => {
      expect(importOrder).toEqual([
        'environment:.env-files/.env.custom:false',
        'runtime',
        'commands',
      ]);
    });
  });

  it.each([['--env-file'], ['--env-file='], ['--env-file', '--debug']])(
    'should reject a malformed bootstrap argument %j',
    async (...arguments_) => {
      process.argv.push(...arguments_);

      await expect(import('./main')).rejects.toThrow('--env-file');
    },
  );

  it('should stop scanning environment files after the sentinel', async () => {
    process.argv.push(
      '--env-file',
      '.env-files/.env.custom',
      '--',
      '--env-file',
      '.env-files/.env.ignored',
    );

    await import('./main');

    await vi.waitFor(() => {
      expect(importOrder).toEqual([
        'environment:.env-files/.env.custom:false',
        'runtime',
        'commands',
      ]);
    });
  });
});
