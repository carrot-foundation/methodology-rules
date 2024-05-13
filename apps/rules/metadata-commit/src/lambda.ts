import type { Handler, S3Event } from 'aws-lambda';

import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Octokit } from 'octokit';
import { assert } from 'typia';

import type { EnvironmentVariables, Metadata } from './lambda.types';

import {
  createGitCommit,
  getLastGitCommit,
  pushGitCommit,
  updateRules,
} from './lambda.helpers';

export const handler: Handler = async (s3Event: S3Event) => {
  const environmentVariables = assert<EnvironmentVariables>(process.env);

  const {
    rest: { git, repos },
  } = new Octokit({
    auth: environmentVariables.GH_OCTOKIT_TOKEN,
  });

  for await (const record of s3Event.Records) {
    const header = await new S3Client().send(
      new HeadObjectCommand({
        Bucket: record.s3.bucket.name,
        Key: record.s3.object.key,
      }),
    );

    const metadata = assert<Metadata>(header.Metadata);

    const rules = await updateRules(repos, metadata, environmentVariables);

    const lastCommit = await getLastGitCommit(git, environmentVariables);

    const commitSha = await createGitCommit({
      environmentVariables,
      git,
      lastCommit,
      rules,
    });

    await pushGitCommit(git, commitSha, environmentVariables);
  }
};
