import type { NonEmptyString } from '@carrot-fndn/shared/types';

import { Octokit } from 'octokit';

export interface Rule {
  commit_hash: NonEmptyString;
  file_checksum: NonEmptyString;
  s3_bucket: NonEmptyString;
  s3_key: NonEmptyString;
  source_code_url: NonEmptyString;
}

export type Rules = { rules: Record<NonEmptyString, Rule> };

export interface Metadata {
  'commit-hash': NonEmptyString;
  'file-checksum': NonEmptyString;
  'rule-name': NonEmptyString;
  'source-code-url': NonEmptyString;
}

export interface EnvironmentVariables {
  ENVIRONMENT: NonEmptyString;
  GH_OCTOKIT_TOKEN: NonEmptyString;
  GH_OWNER: NonEmptyString;
  GH_REPO: NonEmptyString;
  REFERENCE_BRANCH: NonEmptyString;
}

export type OctokitGit = Octokit['rest']['git'];
export type OctokitRepos = Octokit['rest']['repos'];
