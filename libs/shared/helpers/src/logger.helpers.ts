import pino from 'pino';

const level = process.env['LOG_LEVEL'] ?? 'info';

export const logger = pino(
  process.env['LOG_FORMAT'] === 'pretty'
    ? {
        level,
        transport: {
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss.l',
          },
          target: 'pino-pretty',
        },
      }
    : { level },
);
