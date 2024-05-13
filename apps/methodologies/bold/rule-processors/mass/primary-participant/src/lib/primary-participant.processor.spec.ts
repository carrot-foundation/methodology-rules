import { stubDocument } from '@carrot-fndn/methodologies/bold/testing';
import {
  DocumentLoaderService,
  stubDocumentEntity,
} from '@carrot-fndn/shared/document/loader';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { PrimaryParticipantProcessor } from './primary-participant.processor';
import { stubDocumentActorEventWithSourceActorTypeAndPrimaryParticipant } from './primary-participant.processor.stub';

jest.mock('@carrot-fndn/shared/document/loader');

describe('PrimaryParticipantProcessor', () => {
  const ruleDataProcessor = new PrimaryParticipantProcessor();
  const documentLoaderService = jest.mocked(DocumentLoaderService.prototype);

  it.each([
    {
      document:
        stubDocumentActorEventWithSourceActorTypeAndPrimaryParticipant(),
      resultStatus: RuleOutputStatus.APPROVED,
      scenario: 'with primary participant',
    },
    {
      document: stubDocument(),
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'without primary participant',
    },
    {
      document: {},
      resultStatus: RuleOutputStatus.REJECTED,
      scenario: 'document is not found',
    },
  ])(
    `should return "$resultStatus" when the document $scenario`,
    async ({ document, resultStatus }) => {
      const ruleInput = random<Required<RuleInput>>();
      const documentEntity = {
        ...stubDocumentEntity(),
        document,
      };

      documentLoaderService.load.mockResolvedValueOnce(documentEntity);

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
});
