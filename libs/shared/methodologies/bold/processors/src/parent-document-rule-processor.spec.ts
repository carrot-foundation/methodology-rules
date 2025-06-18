import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';
import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  type RuleInput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { ParentDocumentRuleProcessor } from './parent-document-rule-processor';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('ParentDocumentRuleProcessor', () => {
  const mockedloadDocument = jest.mocked(loadDocument);

  class TestParentDocumentRuleProcessor extends ParentDocumentRuleProcessor<
    []
  > {
    evaluateResult(data: []): EvaluateResultOutput {
      return {
        resultStatus: isNil(data)
          ? RuleOutputStatus.FAILED
          : RuleOutputStatus.PASSED,
      };
    }

    getRuleSubject(): [] {
      return [];
    }

    protected override async loadDocument(
      ruleInput: RuleInput,
    ): Promise<Document | undefined> {
      return super.loadDocument(ruleInput);
    }
  }
  let processor: TestParentDocumentRuleProcessor;

  beforeEach(() => {
    processor = new TestParentDocumentRuleProcessor();
  });

  describe('loadDocument', () => {
    it('should return undefined if document does not exist', async () => {
      const ruleInput = random<RuleInput>();

      const result = await processor['loadDocument'](ruleInput);

      expect(result).toBeUndefined();
    });

    it('should return document if it exists', async () => {
      const ruleInput = random<RuleInput>();
      const document = random<Document>();

      mockedloadDocument.mockResolvedValueOnce(document);

      const result = await processor['loadDocument'](ruleInput);

      expect(result).toEqual(document);
    });
  });
});
