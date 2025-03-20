import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { DropOffAtRecyclingFacilityProcessor } from './drop-off-at-recycling-facility.processor';
import { dropOffAtRecyclingFacilityTestCases } from './drop-off-at-recycling-facility.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('DropOffAtRecyclingFacilityProcessor', () => {
  const ruleDataProcessor = new DropOffAtRecyclingFacilityProcessor();

  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each(dropOffAtRecyclingFacilityTestCases)(
    'should return $resultStatus when $scenario',
    async ({ events, resultComment, resultStatus }) => {
      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument({
          externalEventsMap: events,
        })
        .build();

      const ruleInput = random<Required<RuleInput>>();

      documentLoaderService.mockResolvedValueOnce(massIdDocument);

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
