import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { DriverIdentificationProcessor } from './driver-identification.processor';
import { driverIdentificationTestCases } from './driver-identification.test-cases';

const { PICK_UP } = DocumentEventName;

vi.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('DriverIdentificationProcessor', () => {
  const ruleDataProcessor = new DriverIdentificationProcessor();

  const documentLoaderService = vi.mocked(loadDocument);

  it.each(driverIdentificationTestCases)(
    'should return $resultStatus when $scenario',
    async ({ pickUpEvent, resultComment, resultStatus }) => {
      const ruleInput = stubRuleInput();

      const { massIDDocument } = new BoldStubsBuilder()
        .createMassIDDocuments({
          externalEventsMap: {
            [PICK_UP]: pickUpEvent,
          },
        })
        .build();

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
