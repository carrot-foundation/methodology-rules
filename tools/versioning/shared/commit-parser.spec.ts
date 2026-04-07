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
    const commits = ['feat(weighing)!: change output format'];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(new Map([['weighing', 'major']]));
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

  it('should treat BREAKING CHANGE in body as feat (body detection not supported)', () => {
    // Only the '!' header notation triggers a major bump.
    // Body-level "BREAKING CHANGE:" is ignored because commits are parsed
    // from subject lines only (git log --format=%s).
    const commits = [
      'feat(document-value): rework API\n\nBREAKING CHANGE: output format changed',
    ];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(new Map([['document-value', 'minor']]));
  });

  it('should keep major even when a subsequent commit is patch', () => {
    const commits = [
      'feat(weighing)!: redesign output schema',
      'fix(weighing): typo in field name',
    ];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(new Map([['weighing', 'major']]));
  });

  it('should handle revert as patch', () => {
    const commits = ['revert(audit-eligibility-check): undo last change'];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(
      new Map([['audit-eligibility-check', 'patch']]),
    );
  });

  it('should return empty map for empty array', () => {
    expect(parseCommitsForRules([])).toEqual(new Map());
  });

  it('should skip empty string messages', () => {
    expect(parseCommitsForRules([''])).toEqual(new Map());
  });

  it('should parse a composite key scope (methodology/scope/slug)', () => {
    const commits = [
      'feat(bold/credit-order/rewards-distribution): add calculation',
    ];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(
      new Map([['bold/credit-order/rewards-distribution', 'minor']]),
    );
  });

  it('should track composite key scopes independently', () => {
    const commits = [
      'fix(bold/credit-order/rewards-distribution): fix rounding',
      'feat(bold/mass-id-certificate/rewards-distribution): add validation',
    ];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(
      new Map([
        ['bold/credit-order/rewards-distribution', 'patch'],
        ['bold/mass-id-certificate/rewards-distribution', 'minor'],
      ]),
    );
  });

  it('should handle multiple rules in one batch', () => {
    const commits = [
      'fix(audit-eligibility-check): fix date parsing',
      'feat(drop-off-at-recycler): add radius check',
      'fix(weighing): handle edge case',
    ];
    const result = parseCommitsForRules(commits);

    expect(result).toEqual(
      new Map([
        ['audit-eligibility-check', 'patch'],
        ['drop-off-at-recycler', 'minor'],
        ['weighing', 'patch'],
      ]),
    );
  });
});
