import type { AnyObject, Uri } from '@carrot-fndn/shared/types';
import type { AxiosInstance } from 'axios';

import { isNonEmptyString } from '@carrot-fndn/shared/helpers';

import { type SignRequestInput, signRequest } from './aws-http.service.helpers';

type Body = Required<SignRequestInput['body']>;

export class AwsHttpService {
  constructor(readonly httpService: AxiosInstance) {}

  private async request<Response, DTO extends Body = AnyObject>(
    method: 'POST' | 'PUT',
    url: Uri,
    dto: DTO,
  ): Promise<Response> {
    try {
      const { headers, ...signedRequest } = await this.signRequest({
        dto,
        method,
        url,
      });

      const { data } = await this.httpService.request<Response>({
        data: signedRequest.body as unknown,
        headers,
        method,
        url,
      });

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new TypeError(
          `AWS HTTP ${method} request failed: ${error.message}`,
        );
      }

      throw error;
    }
  }

  private async signRequest({
    dto,
    method,
    url,
  }: {
    dto: Body;
    method: 'GET' | 'POST' | 'PUT';
    url: Uri;
  }) {
    const awsRegion = process.env['AWS_REGION'];

    if (!isNonEmptyString(awsRegion)) {
      throw new Error('AWS_REGION is not set');
    }

    return signRequest(
      {
        body: method === 'GET' ? undefined : dto,
        method,
        query: method === 'GET' ? dto : undefined,
        url: new URL(url),
      },
      awsRegion,
    );
  }

  protected async post<Response, DTO extends Body = AnyObject>(
    url: Uri,
    dto: DTO,
  ): Promise<Response> {
    return this.request<Response, DTO>('POST', url, dto);
  }
}
