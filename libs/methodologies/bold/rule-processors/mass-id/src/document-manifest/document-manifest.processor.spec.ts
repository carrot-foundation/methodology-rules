import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { DocumentManifestProcessor } from './document-manifest.processor';
import {
  documentManifestTestCases,
  exceptionTestCases,
} from './document-manifest.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('DocumentManifestProcessor', () => {
  const documentLoaderService = jest.mocked(loadParentDocument);

  it.each([...exceptionTestCases, ...documentManifestTestCases])(
    'should return $resultStatus when $scenario',
    async ({ documentManifestType, events, resultComment, resultStatus }) => {
      const ruleDataProcessor = new DocumentManifestProcessor(
        documentManifestType,
      );

      const ruleInput = random<Required<RuleInput>>();

      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument({
          externalEventsMap: events,
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
