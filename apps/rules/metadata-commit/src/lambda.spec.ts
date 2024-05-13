import type { Context, S3EventRecord } from 'aws-lambda';

import { S3Client } from '@aws-sdk/client-s3';
import { Octokit } from 'octokit';
import { assert, random } from 'typia';

import type { EnvironmentVariables, Metadata, Rules } from './lambda.types';

import { handler } from './lambda';
import { updateRules } from './lambda.helpers';
import { stubEnvironmentVariables, stubS3ObjectMetadata } from './lambda.stubs';

jest.mock('@aws-sdk/client-s3');

describe('handler', () => {
  const S3ClientMock = new S3Client({});

  process.env = stubEnvironmentVariables(process.env);

  const environmentVariables = assert<EnvironmentVariables>(process.env);

  const {
    rest: { repos },
  } = new Octokit({
    auth: environmentVariables.GH_OCTOKIT_TOKEN,
  });

  it('should throw error if metadata is not correct type', async () => {
    const metadata = {
      ...random<Omit<Metadata, 'commit-hash'>>(),
      'rule-name': stubS3ObjectMetadata()['rule-name'],
    };

    jest.spyOn(S3ClientMock, 'send').mockResolvedValue({
      Metadata: metadata,
    } as never);

    await expect(
      handler(
        { Records: [random<S3EventRecord>()] },
        random<Context>(),
        () => {},
      ),
    ).rejects.toThrow(
      'Error on typia.assert(): invalid type on $input["commit-hash"]',
    );
  });

  it('should throw error if rules is not correct type', async () => {
    const metadata = stubS3ObjectMetadata();

    jest.spyOn(S3ClientMock, 'send').mockResolvedValue({
      Metadata: metadata,
    } as never);

    jest.spyOn(repos, 'getContent').mockResolvedValue({
      data: JSON.stringify({ rules: '' }),
    } as never);

    await expect(
      updateRules(repos, metadata, environmentVariables),
    ).rejects.toThrow(
      'Error on typia.misc.assertClone(): invalid type on $input.rules',
    );
  });

  it('should throw error if rule is not correct type', async () => {
    const metadata = stubS3ObjectMetadata();

    jest.spyOn(S3ClientMock, 'send').mockResolvedValue({
      Metadata: metadata,
    } as never);

    jest.spyOn(repos, 'getContent').mockResolvedValue({
      data: JSON.stringify(random<Rules>()),
    } as never);

    await expect(
      updateRules(repos, metadata, environmentVariables),
    ).rejects.toThrow(
      'Error on typia.assert(): invalid type on $input, expect to be Rule',
    );
  });

  it('should throw error if environment variables is not correct type', async () => {
    process.env = stubEnvironmentVariables({ ENVIRONMENT: '' });

    const metadata = stubS3ObjectMetadata();

    jest.spyOn(S3ClientMock, 'send').mockResolvedValue({
      Metadata: metadata,
    } as never);

    await expect(
      handler(
        { Records: [random<S3EventRecord>()] },
        random<Context>(),
        () => {},
      ),
    ).rejects.toThrow(
      'Error on typia.assert(): invalid type on $input.ENVIRONMENT',
    );
  });
});
