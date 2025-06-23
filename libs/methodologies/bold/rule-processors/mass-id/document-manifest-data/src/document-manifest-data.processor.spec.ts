import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { DocumentManifestDataProcessor } from './document-manifest-data.processor';
import {
  documentManifestDataTestCases,
  exceptionTestCases,
} from './document-manifest-data.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('DocumentManifestDataProcessor', () => {
  const documentLoaderService = jest.mocked(loadDocument);

  it.each([...exceptionTestCases, ...documentManifestDataTestCases])(
    'should return $resultStatus when $scenario',
    async ({ documentManifestType, events, resultComment, resultStatus }) => {
      const ruleDataProcessor = new DocumentManifestDataProcessor(
        documentManifestType,
      );

      const ruleInput = random<Required<RuleInput>>();

      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocuments({
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
