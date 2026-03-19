import { type AxiosInstance } from 'axios';

import { AwsHttpService } from './aws-http.service';
import * as awsHelpers from './aws-http.service.helpers';

vi.mock('@carrot-fndn/shared/env', () => ({
  getAwsRegion: () => 'us-east-1',
}));

vi.mock('./aws-http.service.helpers', () => ({
  signRequest: vi.fn(),
}));

describe('HttpService', () => {
  let service: AwsHttpService;
  let mockAxios: vi.Mocked<AxiosInstance>;

  beforeEach(() => {
    mockAxios = {
      request: vi.fn(),
    } as unknown as vi.Mocked<AxiosInstance>;

    (awsHelpers.signRequest as vi.Mock).mockResolvedValue({
      body: { data: 'signed' },
      headers: { Authorization: 'AWS4-HMAC-SHA256' },
    });

    service = new AwsHttpService(mockAxios);
  });

  afterEach(() => {
    vi.clearAllMocks();
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

    it('should throw error when request fails', async () => {
      mockAxios.request.mockRejectedValueOnce(new Error('Request failed'));

      await expect(
        service['post']('https://api.example.com', { data: 'test' }),
      ).rejects.toThrow('AWS HTTP POST request failed: Request failed');
    });

    it('should throw original error when non-Error object is thrown', async () => {
      const nonErrorObject = { message: 'Custom error' };

      mockAxios.request.mockRejectedValueOnce(nonErrorObject);

      await expect(
        service['post']('https://api.example.com', { data: 'test' }),
      ).rejects.toBe(nonErrorObject);
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
