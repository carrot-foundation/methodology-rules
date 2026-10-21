import { isNil } from '@carrot-fndn/shared/helpers';
import {
  RuleFindingSchema,
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import {
  createStubFromSchema,
  stubRuleInput,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

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
        resultStatus: isNil(data) ? 'FAILED' : 'PASSED',
      };
    }

    protected getRuleSubject(value: string[]): string[] {
      return value;
    }

    protected loadDocument({
      parentDocumentId,
    }: RuleInput): Promise<string[] | undefined> {
      if (parentDocumentId === 'valid-id') {
        return Promise.resolve([faker.string.sample(), faker.string.sample()]);
      }

      return Promise.resolve(undefined);
    }
  }

  let ruleStandardDataProcessor: TestRuleStandardDataProcessor;

  beforeEach(() => {
    ruleStandardDataProcessor = new TestRuleStandardDataProcessor();
  });

  it('should return a FAILED result with the shared finding when the document is not found', async () => {
    const ruleInput = stubRuleInput();
    const parentDocumentId = 'invalid-id';

    const result = await ruleStandardDataProcessor.process({
      ...ruleInput,
      parentDocumentId,
    });

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment: `Could not load the document with id ${parentDocumentId}`,
      resultContent: {
        findings: [
          {
            code: 'shared.ERROR.DOCUMENT_NOT_LOADED',
            defaultOwner: 'CARROT',
          },
        ],
      },
      resultStatus: 'FAILED',
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return the findings evaluated by the rule', async () => {
    const ruleInput = stubRuleInput();
    const resultFindings = [createStubFromSchema(RuleFindingSchema)];

    (ruleStandardDataProcessor as any)['evaluateResult'] = vi.fn(() => ({
      resultComment: 'Failed',
      resultFindings,
      resultStatus: 'FAILED',
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
      resultContent: { findings: resultFindings },
      resultStatus: 'FAILED',
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return a resultStatus PASSED if the rule is not applicable', async () => {
    const ruleInput = stubRuleInput();

    (ruleStandardDataProcessor as any)['getRuleSubject'] = vi.fn(
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
      resultStatus: 'PASSED',
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return a resultStatus PASSED if the rule is applicable and passed', async () => {
    const ruleInput = stubRuleInput();

    const result = await ruleStandardDataProcessor.process({
      ...ruleInput,
      parentDocumentId: 'valid-id',
    });

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: 'PASSED',
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return a resultStatus FAILED if the rule is applicable and failed', async () => {
    const ruleInput = stubRuleInput();

    (ruleStandardDataProcessor as any)['evaluateResult'] = vi.fn(() => ({
      resultStatus: 'FAILED',
    }));

    const result = await ruleStandardDataProcessor.process({
      ...ruleInput,
      parentDocumentId: 'valid-id',
    });

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: 'FAILED',
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return a result with a fail comment when the rule is applicable and failed', async () => {
    const ruleInput = stubRuleInput();

    (ruleStandardDataProcessor as any)['evaluateResult'] = vi.fn(() => ({
      resultComment: 'Failed',
      resultStatus: 'FAILED',
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
      resultStatus: 'FAILED',
    };

    expect(result).toEqual(expectedRuleOutput);
  });

  it('should return a resultContent when the rule is applicable and failed', async () => {
    const ruleInput = stubRuleInput();
    const resultContent = { [faker.string.sample()]: faker.string.sample() };

    (ruleStandardDataProcessor as any)['evaluateResult'] = vi.fn(() => ({
      resultComment: 'Failed',
      resultContent,
      resultStatus: 'FAILED',
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
      resultStatus: 'FAILED',
    };

    expect(result).toEqual(expectedRuleOutput);
  });
});
