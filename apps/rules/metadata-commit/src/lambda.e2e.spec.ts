import type { Context, S3EventRecord } from 'aws-lambda';

import { S3Client } from '@aws-sdk/client-s3';
import { Octokit } from 'octokit';
import { assert, random } from 'typia';

import type { Rules } from './lambda.types';

import { handler } from './lambda';
import { stubEnvironmentVariables, stubS3ObjectMetadata } from './lambda.stubs';

jest.mock('@aws-sdk/client-s3');

describe('handler E2E', () => {
  const S3ClientMock = new S3Client({});

  it('should create and push commit with the correct changes', async () => {
    process.env = stubEnvironmentVariables(process.env);

    const {
      rest: { repos },
    } = new Octokit({
      auth: process.env['GH_OCTOKIT_TOKEN'],
    });

    const metadata = stubS3ObjectMetadata();

    jest.spyOn(S3ClientMock, 'send').mockResolvedValue({
      Metadata: metadata,
    } as never);

    await handler(
      { Records: [random<S3EventRecord>()] },
      random<Context>(),
      () => {},
    );

    const { data } = await repos.getContent({
      mediaType: {
        format: 'raw',
      },
      owner: String(process.env['GH_OWNER']),
      path: `apps/rules/infra/aws-lambda/src/rules/${process.env['ENVIRONMENT']}.json`,
      ref: `heads/${process.env['REFERENCE_BRANCH']}`,
      repo: String(process.env['GH_REPO']),
    });

    const { rules } = assert<Rules>(JSON.parse(data.toLocaleString()));

    expect(rules[metadata['rule-name']]).toMatchObject({
      commit_hash: metadata['commit-hash'],
      file_checksum: metadata['file-checksum'],
      source_code_url: metadata['source-code-url'],
    });
  });
});
