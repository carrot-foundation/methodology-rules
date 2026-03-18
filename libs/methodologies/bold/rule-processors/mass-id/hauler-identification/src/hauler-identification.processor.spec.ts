import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubBoldMassIDDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { HaulerIdentificationProcessor } from './hauler-identification.processor';
import { haulerIdentificationTestCases } from './hauler-identification.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('HaulerIdentificationProcessor', () => {
  const ruleDataProcessor = new HaulerIdentificationProcessor();
  const documentLoaderService = jest.mocked(loadDocument);

  it.each(haulerIdentificationTestCases)(
    `should return $resultStatus when $scenario`,
    async ({ events, resultComment, resultStatus }) => {
      const massIDDocumentStub = stubBoldMassIDDocument({
        externalEventsMap: events,
      });

      const ruleInput = stubRuleInput();

      documentLoaderService.mockResolvedValueOnce(massIDDocumentStub);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});
