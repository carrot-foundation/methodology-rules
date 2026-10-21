import type { RuleOutput } from '@carrot-fndn/shared/rule/types';

import { stubRuleInput, stubRuleOutput } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { expectRuleFindings, expectRuleOutput } from './rule-processor.helpers';

const TEST_FINDINGS = { codes: new Set(['test-rule.FAILED.MASS_MISMATCH']) };
const TEST_FINDING = {
  code: 'test-rule.FAILED.MASS_MISMATCH',
  defaultOwner: 'RECYCLER',
};

describe('expectRuleFindings', () => {
  it('should return a FAILED output without its result content when it only held findings', () => {
    const ruleInput = stubRuleInput();
    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: 'FAILED',
    };
    const ruleOutput: RuleOutput = {
      ...expectedRuleOutput,
      resultContent: { findings: [TEST_FINDING] },
    };

    expect(expectRuleFindings(ruleOutput, TEST_FINDINGS)).toStrictEqual(
      expectedRuleOutput,
    );
  });

  it('should keep the remaining result content and accept shared finding codes', () => {
    const remainingContent = { [faker.string.alpha(8)]: faker.string.sample() };
    const ruleOutput = stubRuleOutput({
      resultContent: {
        ...remainingContent,
        findings: [
          TEST_FINDING,
          { code: 'shared.ERROR.DOCUMENT_NOT_LOADED', defaultOwner: 'CARROT' },
        ],
      },
      resultStatus: 'REVIEW_REQUIRED',
    });

    expect(expectRuleFindings(ruleOutput, TEST_FINDINGS)).toStrictEqual({
      ...ruleOutput,
      resultContent: remainingContent,
    });
  });

  it('should return a PASSED output without findings unchanged', () => {
    const ruleOutput = stubRuleOutput({ resultStatus: 'PASSED' });

    expect(expectRuleFindings(ruleOutput, TEST_FINDINGS)).toBe(ruleOutput);
  });

  it.each([
    { description: 'no result content', resultContent: undefined },
    { description: 'no findings', resultContent: {} },
    { description: 'an empty findings array', resultContent: { findings: [] } },
    {
      description: 'a finding with an unknown code',
      resultContent: {
        findings: [{ ...TEST_FINDING, code: 'test-rule.FAILED.UNKNOWN' }],
      },
    },
    {
      description: 'a finding with an invalid owner',
      resultContent: {
        findings: [{ ...TEST_FINDING, defaultOwner: 'NOBODY' }],
      },
    },
  ])('should fail a FAILED output with $description', ({ resultContent }) => {
    const ruleOutput = stubRuleOutput({ resultStatus: 'FAILED' });

    expect(() =>
      expectRuleFindings({ ...ruleOutput, resultContent }, TEST_FINDINGS),
    ).toThrow('Expected validation to succeed');
  });

  it('should fail a PASSED output with findings', () => {
    const ruleOutput = stubRuleOutput({
      resultContent: { findings: [TEST_FINDING] },
      resultStatus: 'PASSED',
    });

    expect(() => expectRuleFindings(ruleOutput, TEST_FINDINGS)).toThrow(
      'to not have property "findings"',
    );
  });
});

describe('expectRuleOutput', () => {
  it('should compare the output without its findings when findings are given', () => {
    const ruleInput = stubRuleInput();
    const resultComment = faker.lorem.sentence();
    const ruleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultContent: { findings: [TEST_FINDING] },
      resultStatus: 'FAILED',
    };

    expect(() =>
      expectRuleOutput({
        findings: TEST_FINDINGS,
        resultComment,
        resultStatus: 'FAILED',
        ruleInput,
        ruleOutput,
      }),
    ).not.toThrow();
  });

  it('should fail when findings are given and the output has none', () => {
    const ruleInput = stubRuleInput();
    const resultComment = faker.lorem.sentence();
    const ruleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultStatus: 'FAILED',
    };

    expect(() =>
      expectRuleOutput({
        findings: TEST_FINDINGS,
        resultComment,
        resultStatus: 'FAILED',
        ruleInput,
        ruleOutput,
      }),
    ).toThrow();
  });
});
