import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubBoldMassIDDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { VehicleIdentificationProcessor } from './vehicle-identification.processor';
import { vehicleIdentificationTestCases } from './vehicle-identification.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('VehicleIdentificationProcessor', () => {
  const ruleDataProcessor = new VehicleIdentificationProcessor();

  const documentLoaderService = jest.mocked(loadDocument);

  it.each(vehicleIdentificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultStatus }) => {
      const ruleInput = stubRuleInput();
      const document = stubBoldMassIDDocument({
        externalEventsMap: events,
      });

      documentLoaderService.mockResolvedValueOnce(document);

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
