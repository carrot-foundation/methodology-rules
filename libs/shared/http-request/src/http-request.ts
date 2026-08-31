import {
  type AwsCredentialIdentityProvider,
  signRequest,
} from '@carrot-fndn/shared/aws-http';
import { getAwsRegion } from '@carrot-fndn/shared/env';
import {
  isNonEmptyString,
  logger as pinoLogger,
} from '@carrot-fndn/shared/helpers';
import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  isAxiosError,
} from 'axios';
import { type Logger } from 'pino';

export interface HttpRequestOptions {
  credentials?: AwsCredentialIdentityProvider | undefined;
  ignoreTimeoutError?: boolean;
  logger?: Logger;
}

const isAbsoluteUrl = (url: string): boolean =>
  /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);

const resolveRequestUrl = ({
  allowAbsoluteUrls,
  baseURL,
  url,
}: Pick<AxiosRequestConfig, 'allowAbsoluteUrls' | 'baseURL' | 'url'>): URL => {
  const requestUrl = url === '' ? baseURL : (url ?? baseURL);

  if (!isNonEmptyString(requestUrl)) {
    throw new Error('Request URL is required');
  }

  if (
    baseURL !== undefined &&
    url !== undefined &&
    url !== '' &&
    (!isAbsoluteUrl(url) || allowAbsoluteUrls === false)
  ) {
    return new URL(
      `${baseURL.replace(/\/?\/$/, '')}/${url.replace(/^\/+/, '')}`,
    );
  }

  return new URL(requestUrl);
};

const isUnsignedLocalhostRequest = (url: URL): boolean =>
  url.hostname === 'localhost' && url.protocol === 'http:';

export const prepareHttpRequestConfig = async (
  config: AxiosRequestConfig,
  { credentials }: Pick<HttpRequestOptions, 'credentials'> = {},
): Promise<AxiosRequestConfig> => {
  const url = resolveRequestUrl(config);

  if (!isNonEmptyString(config.method)) {
    throw new Error('Request method is required');
  }

  if (isUnsignedLocalhostRequest(url)) {
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
    getAwsRegion(),
    credentials,
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
  options: { ignoreTimeoutError: boolean; logger: Logger },
): AxiosResponse | null | undefined => {
  const { ignoreTimeoutError, logger } = options;

  if (!isAxiosError(error)) {
    throw new Error('Request failed');
  }

  const status = error.response?.status;
  const errorCode = error.code ?? 'UNKNOWN';
  const message = `Request failed with status ${String(status)} (${errorCode})`;

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

  logger.debug({ errorCode, status }, message);

  if (status !== undefined && status >= 400 && status < 500) {
    return error.response;
  }

  throw new Error(message);
};

export const httpRequest = async (
  config: AxiosRequestConfig,
  {
    credentials,
    ignoreTimeoutError = false,
    logger = pinoLogger,
  }: HttpRequestOptions = {},
): Promise<AxiosResponse | null | undefined> => {
  const requestConfig = await prepareHttpRequestConfig(config, { credentials });

  try {
    return await axios(requestConfig);
  } catch (error) {
    return handleRequestError(error, {
      ignoreTimeoutError,
      logger,
    });
  }
};
