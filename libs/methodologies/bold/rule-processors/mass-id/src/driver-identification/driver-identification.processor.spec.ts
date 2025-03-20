import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { DriverIdentificationProcessor } from './driver-identification.processor';
import { driverIdentificationTestCases } from './driver-identification.test-cases';

const { PICK_UP } = DocumentEventName;

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('DriverIdentificationProcessor', () => {
  const ruleDataProcessor = new DriverIdentificationProcessor();

  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each(driverIdentificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({ pickUpEvent, resultComment, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument({
          externalEventsMap: {
            [PICK_UP]: pickUpEvent,
          },
        })
        .build();

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
