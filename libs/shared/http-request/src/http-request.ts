import type { AxiosRequestConfig } from 'axios';

import { signRequest } from '@carrot-fndn/shared/aws-http';
import {
  isNonEmptyString,
  logger as pinoLogger,
} from '@carrot-fndn/shared/helpers';
import axios from 'axios';
import { type Logger } from 'pino';

export const prepareHttpRequestConfig = async (
  config: AxiosRequestConfig,
): Promise<AxiosRequestConfig> => {
  const url = new URL([config.baseURL, config.url].join(''));
  const signedRequest = config.baseURL?.includes('localhost') !== true;

  if (!isNonEmptyString(config.method)) {
    throw new Error('Request method is required');
  }

  if (!signedRequest) {
    return config;
  }

  const { headers } = await signRequest(
    {
      body: config.method === 'POST' ? config.data : undefined,
      method: config.method,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      query: config.method === 'GET' ? config.params : undefined,
      url,
    },
    process.env['AWS_REGION'] as string,
  );

  return {
    ...config,
    headers: {
      ...config.headers,
      ...headers,
    },
  };
};

export const handleRequestError = (
  error: unknown,
  config: AxiosRequestConfig,
  options: { ignoreTimeoutError: boolean; logger: Logger },
) => {
  const { ignoreTimeoutError, logger } = options;
  const url = new URL([config.baseURL, config.url].join(''));

  if (!axios.isAxiosError(error)) {
    throw new Error('Request failed', { cause: error });
  }

  const status = error.response?.status as number;
  const message = `API call ${url.toString()} responded with ${status}`;

  if (status === 504) {
    if (!ignoreTimeoutError) {
      logger.error(message);
    }

    if (ignoreTimeoutError) {
      return null;
    }
  } else {
    logger.error(message);
  }

  logger.debug(error, message);

  if (status >= 400 && status < 500) {
    return error.response;
  }

  throw new Error('Request failed', { cause: error });
};

export const httpRequest = async (
  config: AxiosRequestConfig,
  {
    ignoreTimeoutError = false,
    logger = pinoLogger,
  }: {
    ignoreTimeoutError?: boolean;
    logger?: Logger;
  } = {},
) => {
  const requestConfig = await prepareHttpRequestConfig(config);

  try {
    return await axios(requestConfig);
  } catch (error) {
    return handleRequestError(error, config, { ignoreTimeoutError, logger });
  }
};
