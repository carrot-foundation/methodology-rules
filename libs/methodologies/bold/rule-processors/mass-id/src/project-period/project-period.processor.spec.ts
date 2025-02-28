import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  type RuleInput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { ProjectPeriodProcessor } from './project-period.processor';
import { createProjectPeriodTestData } from './project-period.stubs';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

class TestProjectPeriodProcessor extends ProjectPeriodProcessor {
  public getTestEligibleDate(): Date {
    return this.getEligibleDate();
  }
}

describe('ProjectPeriodProcessor', () => {
  const ruleDataProcessor = new TestProjectPeriodProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  const getEligibleDate = () => ruleDataProcessor.getTestEligibleDate();

  // Get test data from stubs
  const {
    documentWithAfterEligibleDateEvent,
    documentWithBRTEligibleDateEvent,
    documentWithBeforeEligibleDateEvent,
    documentWithExactBRTEligibleDateEvent,
    documentWithExactEligibleDateEvent,
    documentWithMissingExternalCreatedAtEvent,
    documentWithNoRecycledEvent,
  } = createProjectPeriodTestData({ eligibleDate: getEligibleDate() });

  it.each([
    {
      document: documentWithAfterEligibleDateEvent,
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created after the eligible date',
    },
    {
      document: documentWithBeforeEligibleDateEvent,
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].INELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should REJECT the rule if the Recycled event was created before the eligible date',
    },
    {
      document: documentWithExactEligibleDateEvent,
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created on the eligible date',
    },
    {
      document: documentWithExactEligibleDateEvent,
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created on the eligible date',
    },
    {
      document: documentWithBRTEligibleDateEvent,
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created 1 second before the eligible date in UTC but appears after in BRT timezone',
    },
    {
      document: documentWithExactBRTEligibleDateEvent,
      resultComment:
        ruleDataProcessor['RESULT_COMMENT'].ELIGIBLE(getEligibleDate()),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'should APPROVE the rule if the Recycled event was created exactly at the eligible date (BRT timezone)',
    },
    {
      document: documentWithMissingExternalCreatedAtEvent,
      resultComment:
        ruleDataProcessor['RESULT_COMMENT']
          .MISSING_RECYCLED_EVENT_EXTERNAL_CREATED_AT,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'should REJECT the rule if the Recycled event has no externalCreatedAt attribute',
    },
  ])('$scenario', async ({ document, resultComment, resultStatus }) => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toMatchObject({
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultComment,
      resultStatus,
    });

    expect(typeof ruleOutput.resultComment).toBe('string');
  });

  it('should REJECT the rule if the Recycled event is not found', async () => {
    const ruleInput = random<Required<RuleInput>>();

    documentLoaderService.mockResolvedValueOnce(documentWithNoRecycledEvent);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    expect(ruleOutput).toMatchObject({
      resultComment: ruleDataProcessor['RESULT_COMMENT'].MISSING_RECYCLED_EVENT,
      resultStatus: RuleOutputStatus.REJECTED,
    });
  });
});
