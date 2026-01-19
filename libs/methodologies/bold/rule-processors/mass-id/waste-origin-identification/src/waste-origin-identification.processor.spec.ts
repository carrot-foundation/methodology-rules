import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubBoldMassIDDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { WasteOriginIdentificationProcessor } from './waste-origin-identification.processor';
import { wasteOriginIdentificationTestCases } from './waste-origin-identification.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('WasteOriginIdentificationProcessor', () => {
  const ruleDataProcessor = new WasteOriginIdentificationProcessor();
  const documentLoaderService = jest.mocked(loadDocument);

  it.each(wasteOriginIdentificationTestCases)(
    `should return $resultStatus when $scenario`,
    async ({ events, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();
      const massIDDocument = stubBoldMassIDDocument({
        externalEventsMap: events,
      });

      documentLoaderService.mockResolvedValueOnce(massIDDocument);

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
