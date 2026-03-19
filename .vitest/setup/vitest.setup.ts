import dotenv from 'dotenv';
import path from 'node:path';
import { vi } from 'vitest';

// Load test environment variables (replaces .jest/config/dotenv-config.ts)
dotenv.config({
  path: path.resolve(import.meta.dirname, '../../.env-files/.env.test'),
});

// Mock pino to be silent in tests (replaces .jest/config/setup-logger.ts)
vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  })),
}));

// Import custom matchers (replaces .jest/config/setup-after-env.ts)
import '../../libs/shared/testing/src/matchers';
