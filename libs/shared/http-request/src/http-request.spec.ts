import {
  type AwsCredentialIdentityProvider,
  signRequest,
} from '@carrot-fndn/shared/aws-http';
import { logger } from '@carrot-fndn/shared/helpers';
import { faker } from '@faker-js/faker';
import axios from 'axios';

import { httpRequest } from './http-request';

vi.mock('axios');
vi.mock('@carrot-fndn/shared/aws-http');
vi.mock('@carrot-fndn/shared/env', () => ({
  getAwsRegion: () => 'us-east-1',
}));

describe('request helpers', () => {
  const mockedAxios = vi.mocked(axios);
  const mockedSignRequest = vi.mocked(signRequest);
  const mockSignedRequestResponse = {
    body: undefined,
    headers: { 'X-Signed': 'true' },
    hostname: 'localhost',
    method: 'GET',
    path: '/',
    protocol: 'https',
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('httpRequest', () => {
    it('should throw error if request method is not passed', async () => {
      const input = { baseURL: faker.internet.url() };

      await expect(httpRequest(input)).rejects.toThrow(
        'Request method is required',
      );
    });

    it('should make a successful request', async () => {
      const mockResponse = { data: 'success' };
      const input = { baseURL: faker.internet.url(), method: 'GET' };

      mockedSignRequest.mockResolvedValue(mockSignedRequestResponse);
      mockedAxios.mockResolvedValue(mockResponse);

      const result = await httpRequest(input);

      expect(result).toEqual(mockResponse);
      expect(axios).toHaveBeenCalledWith(expect.objectContaining(input));
    });

    it('should sign the request when not localhost', async () => {
      mockedSignRequest.mockResolvedValue(mockSignedRequestResponse);

      await httpRequest({
        baseURL: faker.internet.url(),
        method: 'POST',
      });

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Signed': 'true' }),
        }),
      );
    });

    it('should sign a request once with injected credentials', async () => {
      const credentials: AwsCredentialIdentityProvider = vi.fn();
      const input = { baseURL: faker.internet.url(), method: 'POST' };

      mockedSignRequest.mockResolvedValue(mockSignedRequestResponse);

      await httpRequest(input, { credentials });

      expect(mockedSignRequest).toHaveBeenCalledTimes(1);
      expect(mockedSignRequest).toHaveBeenCalledWith(
        {
          body: undefined,
          method: 'POST',
          query: undefined,
          url: new URL(input.baseURL),
        },
        'us-east-1',
        credentials,
      );
    });

    it('should not resolve credentials or sign a localhost request', async () => {
      const credentials: AwsCredentialIdentityProvider = vi.fn();

      await httpRequest(
        {
          baseURL: 'http://localhost:3000',
          method: 'POST',
          url: '/data',
        },
        { credentials },
      );

      expect(credentials).not.toHaveBeenCalled();
      expect(mockedSignRequest).not.toHaveBeenCalled();
      expect(axios).toHaveBeenCalledWith(
        expect.not.objectContaining({
          headers: expect.objectContaining({ 'X-Signed': 'true' }),
        }),
      );
    });

    it('should throw error if the error is not an axios error', async () => {
      const mockError = {
        isAxiosError: false,
        response: { data: 'Not Found', status: 404 },
        status: 404,
      };

      mockedSignRequest.mockResolvedValue(mockSignedRequestResponse);
      mockedAxios.mockRejectedValue(mockError);

      await expect(
        httpRequest({ baseURL: faker.internet.url(), method: 'GET' }),
      ).rejects.toThrow('Request failed');
    });

    it('should handle 4xx errors', async () => {
      const mockError = {
        isAxiosError: true,
        response: { data: 'Not Found', status: 404 },
        status: 404,
      };

      mockedSignRequest.mockResolvedValue(mockSignedRequestResponse);
      vi.spyOn(logger, 'error');
      vi.spyOn(logger, 'debug');
      mockedAxios.mockRejectedValue(mockError);
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      const result = await httpRequest(
        {
          baseURL: faker.internet.url(),
          method: 'GET',
        },
        { logger },
      );

      expect(result).toEqual(mockError.response);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should throw for non-4xx errors', async () => {
      const mockError = {
        isAxiosError: true,
        response: { data: 'Server Error', status: 500 },
      };

      mockedSignRequest.mockResolvedValue(mockSignedRequestResponse);
      vi.spyOn(logger, 'error');
      mockedAxios.mockRejectedValue(mockError);
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      await expect(
        httpRequest(
          { baseURL: faker.internet.url(), method: 'GET' },
          { logger },
        ),
      ).rejects.toThrow('Request failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should exclude signed headers from logger arguments and thrown messages', async () => {
      const authorization = 'AWS4-HMAC-SHA256 Credential=access-key';
      const upperCaseAuthorization =
        'AWS4-HMAC-SHA256 Credential=upper-case-access-key';
      const sessionToken = 'session-token';
      const signingDate = '20260830T000000Z';
      const customAmzHeader = 'custom-amz-header';
      const mockError = {
        code: 'ERR_BAD_RESPONSE',
        config: {
          data: { authorization },
          headers: {
            Authorization: authorization,
            AUTHORIZATION: upperCaseAuthorization,
            'X-AmZ-Date': signingDate,
            'x-amz-security-token': sessionToken,
          },
        },
        isAxiosError: true,
        request: {
          headers: {
            'X-AMZ-Custom': customAmzHeader,
          },
        },
        response: { status: 500 },
      };

      mockedSignRequest.mockResolvedValue(mockSignedRequestResponse);
      mockedAxios.mockRejectedValue(mockError);
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      const errorSpy = vi.spyOn(logger, 'error');
      const debugSpy = vi.spyOn(logger, 'debug');

      let caughtError: Error | undefined;

      try {
        await httpRequest(
          { baseURL: faker.internet.url(), method: 'GET' },
          { logger },
        );
      } catch (error: unknown) {
        if (error instanceof Error) {
          caughtError = error;
        }
      }

      const loggerArguments = [...errorSpy.mock.calls, ...debugSpy.mock.calls];
      const loggerOutput = JSON.stringify(loggerArguments);

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError?.message).not.toContain(authorization);
      expect(caughtError?.message).not.toContain(upperCaseAuthorization);
      expect(caughtError?.message).not.toContain(sessionToken);
      expect(caughtError?.message).not.toContain(signingDate);
      expect(caughtError?.message).not.toContain(customAmzHeader);
      expect(loggerOutput).not.toContain(authorization);
      expect(loggerOutput).not.toContain(upperCaseAuthorization);
      expect(loggerOutput).not.toContain(sessionToken);
      expect(loggerOutput).not.toContain(signingDate);
      expect(loggerOutput).not.toContain(customAmzHeader);
      expect(debugSpy).toHaveBeenCalledWith(
        { errorCode: 'ERR_BAD_RESPONSE', status: 500 },
        'Request failed with status 500 (ERR_BAD_RESPONSE)',
      );
    });

    it('should handle timeout errors and return null', async () => {
      const mockError = {
        isAxiosError: true,
        response: { data: 'Gateway Timeout', status: 504 },
      };

      mockedSignRequest.mockResolvedValue(mockSignedRequestResponse);
      vi.spyOn(logger, 'error');
      mockedAxios.mockRejectedValue(mockError);
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      const result = await httpRequest(
        { baseURL: faker.internet.url(), method: 'GET' },
        { ignoreTimeoutError: true, logger },
      );

      expect(result).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle timeout errors and throw error', async () => {
      const mockError = {
        isAxiosError: true,
        response: { data: 'Gateway Timeout', status: 504 },
      };

      mockedSignRequest.mockResolvedValue(mockSignedRequestResponse);
      vi.spyOn(logger, 'error');
      mockedAxios.mockRejectedValue(mockError);
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      await expect(
        httpRequest(
          { baseURL: faker.internet.url(), method: 'GET' },
          { ignoreTimeoutError: false, logger },
        ),
      ).rejects.toThrow('Request failed');

      expect(logger.error).not.toHaveBeenCalledTimes(2);
    });
  });
});
