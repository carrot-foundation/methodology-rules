import { Sha256 } from '@aws-crypto/sha256-js';
import { fromEnv } from '@aws-sdk/credential-providers';
import { isObject } from '@carrot-fndn/shared/helpers';
import { SignatureV4 } from '@smithy/signature-v4';

export interface SignRequestInput {
  body?: unknown;
  method: string;
  query?: Record<string, null | string | string[]> | undefined;
  url: URL;
}

export const signRequest = async (
  { body, method, query, url }: SignRequestInput,
  awsRegion: string,
) => {
  const signer = new SignatureV4({
    credentials: fromEnv(),
    region: awsRegion,
    service: 'execute-api',
    sha256: Sha256,
  });

  const headers: Record<string, string> = {
    Host: url.host,
  };

  if (isObject(body)) {
    headers['Content-Type'] = 'application/json';
  }

  return signer.sign({
    headers,
    hostname: url.hostname,
    method,
    path: url.pathname,
    protocol: 'https',
    ...(query && { query }),
    ...(isObject(body) && { body: JSON.stringify(body) }),
  });
};
