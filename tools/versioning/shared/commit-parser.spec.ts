import { describe, expect, it } from 'vitest';

import { parseCommitsForRules } from './commit-parser';

describe('parseCommitsForRules', () => {
  it('should parse a fix commit into a patch bump', () => {
    const commits = ['fix(audit-eligibility-check): handle null dates'];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(
      new Map([['audit-eligibility-check', 'patch']]),
    );
  });

  it('should parse a feat commit into a minor bump', () => {
    const commits = ['feat(document-value): add tolerance threshold'];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(new Map([['document-value', 'minor']]));
  });

  it('should parse a breaking change into a major bump', () => {
    const commits = ['feat(project-boundary)!: change output format'];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(new Map([['project-boundary', 'major']]));
  });

  it('should take the highest bump when multiple commits affect the same rule', () => {
    const commits = [
      'fix(audit-eligibility-check): handle null dates',
      'feat(audit-eligibility-check): add new validation',
    ];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(
      new Map([['audit-eligibility-check', 'minor']]),
    );
  });

  it('should ignore non-release commit types', () => {
    const commits = [
      'docs(audit-eligibility-check): update readme',
      'test(audit-eligibility-check): add edge case',
      'chore: update deps',
    ];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(new Map());
  });

  it('should ignore commits without a scope', () => {
    const commits = ['fix: general bugfix'];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(new Map());
  });

  it('should handle refactor as patch', () => {
    const commits = ['refactor(weighing): simplify logic'];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(new Map([['weighing', 'patch']]));
  });

  it('should handle perf as patch', () => {
    const commits = ['perf(document-manifest-data): optimize query'];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(new Map([['document-manifest-data', 'patch']]));
  });

  it('should handle multiple rules in one batch', () => {
    const commits = [
      'fix(audit-eligibility-check): fix date parsing',
      'feat(project-boundary): add radius check',
      'fix(weighing): handle edge case',
    ];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(
      new Map([
        ['audit-eligibility-check', 'patch'],
        ['project-boundary', 'minor'],
        ['weighing', 'patch'],
      ]),
    );
  });
});
