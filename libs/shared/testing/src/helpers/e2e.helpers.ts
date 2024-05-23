import type { UnknownObject } from '@carrot-fndn/shared/types';

import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3';
import { STSClient } from '@aws-sdk/client-sts';
import { faker } from '@faker-js/faker';
import { sdkStreamMixin } from '@smithy/util-stream';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'node:stream';

export const prepareEnvironmentTestE2E = <T = UnknownObject>(
  options: Array<{ document?: T } & { documentKey: string }>,
) => {
  process.env = {
    ...process.env,
    AWS_REGION: faker.string.uuid(),
    SMAUG_API_GATEWAY_ASSUME_ROLE_ARN: faker.string.uuid(),
  };

  // Mock report to Smaug
  global.fetch = (): Promise<Response> =>
    Promise.resolve(<Response>{ ok: true });

  const noSuchKeyError = new NoSuchKey({
    $metadata: {},
    message: 'Not found document for Parent Document Key',
  });

  STSClient.prototype.send = () =>
    ({
      Credentials: {
        AccessKeyId: faker.string.uuid(),
        Expiration: new Date(),
        SecretAccessKey: faker.string.uuid(),
        SessionToken: faker.string.uuid(),
      },
    }) as never;

  mockClient(S3Client)
    .on(GetObjectCommand)
    .rejects(noSuchKeyError)
    .on(GetObjectCommand)
    .callsFake((input: { Key: string }) => {
      const index = options.findIndex((item) => item.documentKey === input.Key);

      if (index < 0) {
        throw noSuchKeyError;
      }

      const stream = new Readable();

      stream.push(
        JSON.stringify({
          createdAt: faker.date.anytime().toISOString(),
          // eslint-disable-next-line security/detect-object-injection
          document: options[index]?.document,
          id: faker.string.uuid(),
          versionDate: faker.date.anytime().toISOString(),
        }),
      );

      stream.push(null); // end of stream

      return { Body: sdkStreamMixin(stream) };
    });
};
