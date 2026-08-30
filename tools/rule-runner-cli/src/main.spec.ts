import { Command } from '@commander-js/extra-typings';

const { importOrder, loadEnvironment, recordCommandImport, runProgram } =
  vi.hoisted(() => {
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
      runProgram: vi.fn().mockResolvedValue(undefined),
    };
  });

vi.mock('@carrot-fndn/shared/cli', () => ({
  loadEnvironment,
  runProgram,
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
        'commands',
      ]);
    });
  });

  it('should consume a following option as an environment file', async () => {
    process.argv.push('--env-file', '--debug');

    await import('./main');

    await vi.waitFor(() => {
      expect(importOrder).toEqual(['environment:--debug:false', 'commands']);
    });
  });

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
        'commands',
      ]);
    });
  });
});
