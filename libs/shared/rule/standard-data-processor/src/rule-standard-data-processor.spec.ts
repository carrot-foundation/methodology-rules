import type { AnyObject } from '@carrot-fndn/shared/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import {
  type EvaluateResultOutput,
  RuleStandardDataProcessor,
} from './rule-standard-data-processor';

describe('RuleStandardDataProcessor', () => {
  class TestRuleStandardDataProcessor extends RuleStandardDataProcessor<
    string[],
    string[]
  > {
    protected evaluateResult(data: string[]): EvaluateResultOutput {
      return {
        resultStatus: isNil(data)
          ? RuleOutputStatus.FAILED
          : RuleOutputStatus.PASSED,
      };
    }

    protected getRuleSubject(value: string[]): string[] {
      return value;
    }

    protected loadDocument({
      parentDocumentId,
    }: RuleInput): Promise<string[] | undefined> {
      if (parentDocumentId === 'valid-id') {
        return Promise.resolve(random<string[]>());
      }

      return Promise.resolve(undefined);
    }
  }

  let ruleStandardDataProcessor: TestRuleStandardDataProcessor;

  beforeEach(() => {
    ruleStandardDataProcessor = new TestRuleStandardDataProcessor();
  });

  it('should return a result with a fail comment when the document is not found', async () => {
    const ruleInput = random<RuleInput>();
    const parentDocumentId = 'invalid-id';

    const result = await ruleStandardDataProcessor.process({
      ...ruleInput,
      parentDocumentId,
    });

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment:
        ruleStandardDataProcessor['getDocumentNotFoundResultComment'](
          parentDocumentId,
        ),
      resultStatus: RuleOutputStatus.FAILED,
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return a resultStatus PASSED if the rule is not applicable', async () => {
    const ruleInput = random<RuleInput>();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (ruleStandardDataProcessor as any)['getRuleSubject'] = jest.fn(
      () => undefined,
    );

    const result = await ruleStandardDataProcessor.process({
      ...ruleInput,
      parentDocumentId: 'valid-id',
    });

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment:
        ruleStandardDataProcessor['getMissingRuleSubjectResultComment'](),
      resultStatus: RuleOutputStatus.PASSED,
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return a resultStatus PASSED if the rule is applicable and passed', async () => {
    const ruleInput = random<RuleInput>();

    const result = await ruleStandardDataProcessor.process({
      ...ruleInput,
      parentDocumentId: 'valid-id',
    });

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.PASSED,
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return a resultStatus FAILED if the rule is applicable and failed', async () => {
    const ruleInput = random<RuleInput>();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (ruleStandardDataProcessor as any)['evaluateResult'] = jest.fn(() => ({
      resultStatus: RuleOutputStatus.FAILED,
    }));

    const result = await ruleStandardDataProcessor.process({
      ...ruleInput,
      parentDocumentId: 'valid-id',
    });

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.FAILED,
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return a result with a fail comment when the rule is applicable and failed', async () => {
    const ruleInput = random<RuleInput>();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (ruleStandardDataProcessor as any)['evaluateResult'] = jest.fn(() => ({
      resultComment: 'Failed',
      resultStatus: RuleOutputStatus.FAILED,
    }));

    const result = await ruleStandardDataProcessor.process({
      ...ruleInput,
      parentDocumentId: 'valid-id',
    });

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: 'Failed',
      resultStatus: RuleOutputStatus.FAILED,
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return a resultContent when the rule is applicable and failed', async () => {
    const ruleInput = random<RuleInput>();
    const resultContent = random<AnyObject>();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (ruleStandardDataProcessor as any)['evaluateResult'] = jest.fn(() => ({
      resultComment: 'Failed',
      resultContent,
      resultStatus: RuleOutputStatus.FAILED,
    }));

    const result = await ruleStandardDataProcessor.process({
      ...ruleInput,
      parentDocumentId: 'valid-id',
    });

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: 'Failed',
      resultContent,
      resultStatus: RuleOutputStatus.FAILED,
    };

    expect(result).toEqual(expectedRuleOutput);
  });
});
