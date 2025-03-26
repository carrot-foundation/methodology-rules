import type { AxiosInstance } from 'axios';

import { AwsHttpService } from './aws-http.service';
import * as awsHelpers from './aws-http.service.helpers';

jest.mock('./aws-http.service.helpers', () => ({
  signRequest: jest.fn(),
}));

describe('HttpService', () => {
  let service: AwsHttpService;
  let mockAxios: jest.Mocked<AxiosInstance>;
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = { ...originalEnvironment };
    process.env['AWS_REGION'] = 'us-east-1';

    mockAxios = {
      request: jest.fn(),
    } as unknown as jest.Mocked<AxiosInstance>;

    (awsHelpers.signRequest as jest.Mock).mockResolvedValue({
      body: { data: 'signed' },
      headers: { Authorization: 'AWS4-HMAC-SHA256' },
    });

    service = new AwsHttpService(mockAxios);
  });

  afterEach(() => {
    process.env = originalEnvironment;
    jest.clearAllMocks();
  });

  describe('post', () => {
    it('should successfully make a POST request', async () => {
      const mockResponse = { success: true };

      mockAxios.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await service['post']('https://api.example.com', {
        data: 'test',
      });

      expect(result).toEqual(mockResponse);
      expect(mockAxios.request).toHaveBeenCalledWith({
        data: { data: 'signed' },
        headers: { Authorization: 'AWS4-HMAC-SHA256' },
        method: 'POST',
        url: 'https://api.example.com',
      });

      expect(awsHelpers.signRequest).toHaveBeenCalledWith(
        {
          body: { data: 'test' },
          method: 'POST',
          query: undefined,
          url: expect.any(URL),
        },
        'us-east-1',
      );
    });

    it('should throw error when AWS_REGION is not set', async () => {
      delete process.env['AWS_REGION'];

      await expect(
        service['post']('https://api.example.com', { data: 'test' }),
      ).rejects.toThrow('AWS_REGION is not set');
    });
  });

  describe('signRequest', () => {
    it('should handle GET requests differently', async () => {
      await service['signRequest']({
        dto: { data: 'test' },
        method: 'GET',
        url: 'https://api.example.com',
      });

      expect(awsHelpers.signRequest).toHaveBeenCalledWith(
        {
          body: undefined,
          method: 'GET',
          query: { data: 'test' },
          url: expect.any(URL),
        },
        'us-east-1',
      );
    });

    it('should handle non-GET requests correctly', async () => {
      await service['signRequest']({
        dto: { data: 'test' },
        method: 'PUT',
        url: 'https://api.example.com',
      });

      expect(awsHelpers.signRequest).toHaveBeenCalledWith(
        {
          body: { data: 'test' },
          method: 'PUT',
          query: undefined,
          url: expect.any(URL),
        },
        'us-east-1',
      );
    });
  });
});
