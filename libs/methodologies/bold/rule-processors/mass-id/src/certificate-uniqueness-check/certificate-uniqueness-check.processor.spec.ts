import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { RECYCLED_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { BoldMethodologySlug } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { CertificateUniquenessCheck } from './certificate-uniqueness-check.processor';
import { certificateUniquenessCheckTestCases } from './certificate-uniqueness-check.test-cases';

describe('CertificateUniquenessCheck', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const ruleDataProcessor = new CertificateUniquenessCheck(
    RECYCLED_ID,
    BoldMethodologySlug.RECYCLING,
  );

  it.each(certificateUniquenessCheckTestCases)(
    'should return $resultStatus when $scenario',
    async ({ documents, massIdAuditDocument, resultComment, resultStatus }) => {
      const allDocuments = [...documents, massIdAuditDocument];

      spyOnDocumentQueryServiceLoad(stubDocument(), allDocuments);

      const ruleInput = {
        ...random<Required<RuleInput>>(),
        documentId: massIdAuditDocument.id,
      };

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
