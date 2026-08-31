import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';

const level = process.env['LOG_LEVEL'] ?? 'info';
const structuredLogRedaction = new AsyncLocalStorage<boolean>();

export const executeWithStructuredLogsRedacted = <T>(operation: () => T): T =>
  structuredLogRedaction.run(true, operation);

export const logger = pino({
  hooks: {
    logMethod(arguments_, method) {
      if (structuredLogRedaction.getStore() === true) {
        Reflect.apply(method, this, ['LOCAL_PROCESSOR_LOG_REDACTED']);

        return;
      }

      Reflect.apply(method, this, arguments_);
    },
  },
  level,
  ...(process.env['LOG_FORMAT'] === 'pretty'
    ? {
        transport: {
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss.l',
          },
          target: 'pino-pretty',
        },
      }
    : {}),
});
