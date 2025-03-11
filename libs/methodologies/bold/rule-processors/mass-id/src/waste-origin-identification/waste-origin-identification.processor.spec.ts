import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type DocumentEvent } from '@carrot-fndn/shared/methodologies/bold/types';
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
  const documentLoaderService = jest.mocked(loadParentDocument);
  const { massIdDocumentStub } = new BoldStubsBuilder().build();

  it.each(wasteOriginIdentificationTestCases)(
    `should return $resultStatus when $scenario`,
    async ({
      pickUpEvent,
      resultComment,
      resultStatus,
      wasteGeneratorEvent,
    }) => {
      const ruleInput = random<Required<RuleInput>>();
      const document = {
        ...massIdDocumentStub,
        externalEvents: [
          ...(massIdDocumentStub.externalEvents ?? []),
          pickUpEvent,
          wasteGeneratorEvent,
        ].filter((event): event is DocumentEvent => event !== undefined),
      };

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
