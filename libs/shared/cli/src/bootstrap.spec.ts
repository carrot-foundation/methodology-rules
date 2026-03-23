import type { Command } from '@commander-js/extra-typings';

import { logger } from '@carrot-fndn/shared/helpers';

import { runProgram } from './bootstrap';

vi.mock('@carrot-fndn/shared/helpers', () => ({
  logger: { fatal: vi.fn() },
}));

const createMockProgram = (parseAsync: () => Promise<unknown>): Command =>
  ({ parseAsync }) as unknown as Command;

describe('runProgram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  it('should call parseAsync on the program', async () => {
    const parseAsync = vi.fn().mockResolvedValue(undefined);
    const program = createMockProgram(parseAsync);

    await runProgram(program);

    expect(parseAsync).toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it('should catch errors, log fatal, and set exitCode', async () => {
    const error = new Error('crash');
    const program = createMockProgram(() => Promise.reject(error));

    await runProgram(program);

    expect(logger.fatal).toHaveBeenCalledWith(error, 'Fatal error');
    expect(process.exitCode).toBe(1);
  });
});
