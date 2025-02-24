import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { PrimaryParticipantAddressProcessor } from './primary-participant-address.processor';
import { stubDocumentActorEventWithSourceActorTypeAndPrimaryAddress } from './primary-participant-address.stubs';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('PrimaryParticipantAddressProcessor', () => {
  const ruleDataProcessor = new PrimaryParticipantAddressProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([
    {
      document: stubDocumentActorEventWithSourceActorTypeAndPrimaryAddress(),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario:
        'has an actor event that contains source actor type in metadata and same address id as primaryAddress',
    },
    {
      document: stubDocument(),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario:
        'does not have an actor event with source actor type in metadata',
    },
    {
      document: stubDocument({ category: undefined as unknown as string }),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'has invalid type',
    },
    {
      document: undefined,
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'is undefined',
    },
  ])(
    `should return "$resultStatus" when the document $scenario`,
    async ({ document, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();

      documentLoaderService.mockResolvedValueOnce(document);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );

  it('should return output default with resultStatus REJECTED when parentDocumentId is null', async () => {
    const ruleInput = random<RuleInput>();

    delete ruleInput.parentDocumentId;
    const document = stubDocument();

    documentLoaderService.mockResolvedValueOnce(document);

    const ruleOutput = await ruleDataProcessor.process(ruleInput);

    const expectedRuleOutput: RuleOutput = {
      requestId: ruleInput.requestId,
      responseToken: ruleInput.responseToken,
      responseUrl: ruleInput.responseUrl,
      resultStatus: RuleOutputStatus.REJECTED,
    };

    expect(ruleOutput).toEqual(expectedRuleOutput);
  });
});
