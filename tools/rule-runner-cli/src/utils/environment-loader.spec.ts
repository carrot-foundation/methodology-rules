import dotenv from 'dotenv';

import { loadEnvironment } from './environment-loader';

jest.mock('dotenv');

describe('loadEnvironment', () => {
  it('should load default env file', () => {
    loadEnvironment();

    expect(dotenv.config).toHaveBeenCalledWith({
      path: expect.stringContaining('.env-files/.env.test'),
    });
  });

  it('should load custom env file when provided', () => {
    loadEnvironment('.env-files/.env.custom');

    expect(dotenv.config).toHaveBeenCalledWith({
      path: expect.stringContaining('.env-files/.env.custom'),
    });
  });
});
