import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { UniquenessCheckProcessor } from './uniqueness-check.processor';
import { uniquenessCheckTestCases } from './uniqueness-check.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

const mockCheckDuplicateDocuments = jest.fn();
const mockAuditApiService = {
  checkDuplicateDocuments: mockCheckDuplicateDocuments,
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('./uniqueness-check.helpers', () => ({
  ...jest.requireActual('./uniqueness-check.helpers'),
  createAuditApiService: () => mockAuditApiService,
}));

describe('UniquenessCheckProcessor', () => {
  const ruleDataProcessor = new UniquenessCheckProcessor();
  const documentLoaderService = jest.mocked(loadParentDocument);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(uniquenessCheckTestCases)(
    'should return $resultStatus when $scenario',
    async ({
      newDuplicateDocuments,
      oldDuplicateDocuments,
      resultComment,
      resultStatus,
    }) => {
      const ruleInput = random<Required<RuleInput>>();

      const { massIdDocument } = new BoldStubsBuilder()
        .createMassIdDocument()
        .build();

      documentLoaderService.mockResolvedValueOnce(massIdDocument);
      mockCheckDuplicateDocuments
        .mockResolvedValueOnce(newDuplicateDocuments)
        .mockResolvedValueOnce(oldDuplicateDocuments);

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
