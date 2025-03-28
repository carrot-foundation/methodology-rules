import { signRequest } from '@carrot-fndn/shared/aws-http';
import { logger } from '@carrot-fndn/shared/helpers';
import { faker } from '@faker-js/faker';
import axios from 'axios';

import { httpRequest } from './http-request';

jest.mock('axios');
jest.mock('@carrot-fndn/shared/aws-http');

describe('request helpers', () => {
  const mockedAxios = jest.mocked(axios);
  const mockedSignRequest = jest.mocked(signRequest);
  const mockSignedRequestResponse = {
    body: undefined,
    headers: { 'X-Signed': 'true' },
    hostname: 'localhost',
    method: 'GET',
    path: '/',
    protocol: 'https',
  };

  afterAll(() => {
    jest.clearAllMocks();
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

    it('should not sign the request for localhost', async () => {
      await httpRequest({
        baseURL: 'http://localhost:3000',
        method: 'POST',
        url: '/data',
      });

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
      jest.spyOn(logger, 'error');
      jest.spyOn(logger, 'debug');
      mockedAxios.mockRejectedValue(mockError);
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

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
      jest.spyOn(logger, 'error');
      mockedAxios.mockRejectedValue(mockError);
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      await expect(
        httpRequest(
          { baseURL: faker.internet.url(), method: 'GET' },
          { logger },
        ),
      ).rejects.toThrow('Request failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle timeout errors and return null', async () => {
      const mockError = {
        isAxiosError: true,
        response: { data: 'Gateway Timeout', status: 504 },
      };

      mockedSignRequest.mockResolvedValue(mockSignedRequestResponse);
      jest.spyOn(logger, 'error');
      mockedAxios.mockRejectedValue(mockError);
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

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
      jest.spyOn(logger, 'error');
      mockedAxios.mockRejectedValue(mockError);
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

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
