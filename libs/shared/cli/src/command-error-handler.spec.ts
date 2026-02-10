import { logger } from '@carrot-fndn/shared/helpers';

import { handleCommandError } from './command-error-handler';

jest.mock('@carrot-fndn/shared/helpers', () => ({
  logger: { error: jest.fn() },
}));

describe('handleCommandError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = undefined;
  });

  it('should log Error message and set exitCode', () => {
    handleCommandError(new Error('something broke'));

    expect(logger.error).toHaveBeenCalledWith('something broke', 'Error');
    expect(process.exitCode).toBe(1);
  });

  it('should log non-Error values directly', () => {
    handleCommandError('raw string');

    expect(logger.error).toHaveBeenCalledWith('raw string', 'Error');
    expect(process.exitCode).toBe(1);
  });

  it('should log stack trace when verbose is true and error is an Error', () => {
    const error = new Error('fail');

    handleCommandError(error, { verbose: true });

    expect(logger.error).toHaveBeenCalledWith('fail', 'Error');
    expect(logger.error).toHaveBeenCalledWith(error.stack, 'Stack trace');
  });

  it('should not log stack trace when verbose is false', () => {
    handleCommandError(new Error('fail'), { verbose: false });

    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('should not log stack trace for non-Error values even when verbose', () => {
    handleCommandError('not an error', { verbose: true });

    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
