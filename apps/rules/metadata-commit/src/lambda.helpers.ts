import { assert } from 'typia';
import { assertClone } from 'typia/lib/misc';

import type {
  EnvironmentVariables,
  Metadata,
  OctokitGit,
  OctokitRepos,
  Rule,
  Rules,
} from './lambda.types';

export const getRulesPath = (
  environmentVariables: EnvironmentVariables,
): string =>
  `apps/rules/infra/aws-lambda/src/rules/${environmentVariables.ENVIRONMENT}.json`;

export const updateRules = async (
  repos: OctokitRepos,
  metadata: Metadata,
  environmentVariables: EnvironmentVariables,
): Promise<Rules> => {
  const { data } = await repos.getContent({
    mediaType: {
      format: 'raw',
    },
    owner: environmentVariables.GH_OWNER,
    path: getRulesPath(environmentVariables),
    ref: `heads/${environmentVariables.REFERENCE_BRANCH}`,
    repo: environmentVariables.GH_REPO,
  });

  const cloneData = assertClone<Rules>(JSON.parse(data.toLocaleString()));

  const rule = assert<Rule>(cloneData.rules[metadata['rule-name']]);

  rule.commit_hash = metadata['commit-hash'];
  rule.file_checksum = metadata['file-checksum'];
  rule.source_code_url = metadata['source-code-url'];

  return cloneData;
};

export const getLastGitCommit = async (
  git: OctokitGit,
  environmentVariables: EnvironmentVariables,
) => {
  const mainBranch = await git.getRef({
    owner: environmentVariables.GH_OWNER,
    ref: `heads/${environmentVariables.REFERENCE_BRANCH}`,
    repo: environmentVariables.GH_REPO,
  });

  const {
    data: { sha, tree },
  } = await git.getCommit({
    commit_sha: mainBranch.data.object.sha,
    owner: environmentVariables.GH_OWNER,
    repo: environmentVariables.GH_REPO,
  });

  return { sha, treeSha: tree.sha };
};

const createGitTree = async (options: {
  environmentVariables: EnvironmentVariables;
  git: OctokitGit;
  lastCommit: Awaited<ReturnType<typeof getLastGitCommit>>;
  rules: Rules;
}): Promise<string> => {
  const MODE_FILE_BLOB = '100644';

  const { environmentVariables, git, lastCommit, rules } = options;

  const {
    data: { sha },
  } = await git.createTree({
    base_tree: lastCommit.treeSha,
    owner: environmentVariables.GH_OWNER,
    repo: environmentVariables.GH_REPO,
    tree: [
      {
        content: JSON.stringify(rules, null, 2),
        mode: MODE_FILE_BLOB,
        path: getRulesPath(environmentVariables),
        type: 'commit',
      },
    ],
  });

  return sha;
};

export const createGitCommit = async (options: {
  environmentVariables: EnvironmentVariables;
  git: OctokitGit;
  lastCommit: Awaited<ReturnType<typeof getLastGitCommit>>;
  rules: Rules;
}): Promise<string> => {
  const { environmentVariables, git, lastCommit } = options;

  const gitTreeSha = await createGitTree(options);

  const {
    data: { sha },
  } = await git.createCommit({
    message: `chore: update ${environmentVariables.ENVIRONMENT} rules [skip ci]`,
    owner: environmentVariables.GH_OWNER,
    parents: [lastCommit.sha],
    repo: environmentVariables.GH_REPO,
    tree: gitTreeSha,
  });

  return sha;
};

export const pushGitCommit = async (
  git: OctokitGit,
  commitSha: string,
  environmentVariables: EnvironmentVariables,
) => {
  await git.updateRef({
    owner: environmentVariables.GH_OWNER,
    ref: `heads/${environmentVariables.REFERENCE_BRANCH}`,
    repo: environmentVariables.GH_REPO,
    sha: commitSha,
  });
};
