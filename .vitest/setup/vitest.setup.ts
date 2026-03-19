import dotenv from 'dotenv';
import path from 'node:path';
import { vi } from 'vitest';

// Load test environment variables
dotenv.config({
  path: path.resolve(import.meta.dirname, '../../.env-files/.env.test'),
});

// Mock pino to be silent in tests
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

// Import custom matchers
import '../../libs/shared/testing/src/matchers';
