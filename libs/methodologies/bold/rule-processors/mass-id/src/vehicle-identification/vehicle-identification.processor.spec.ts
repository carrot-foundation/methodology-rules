import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { VehicleIdentificationProcessor } from './vehicle-identification.processor';
import { vehicleIdentificationTestCases } from './vehicle-identification.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('VehicleIdentificationProcessor', () => {
  const ruleDataProcessor = new VehicleIdentificationProcessor();

  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each(vehicleIdentificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      document,
      resultComment,
      resultStatus,
    }: {
      document: Document;
      resultComment: string;
      resultStatus: RuleOutputStatus;
    }) => {
      const ruleInput = random<Required<RuleInput>>();

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
