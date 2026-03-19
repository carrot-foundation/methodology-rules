import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import { RECYCLED_ID } from '@carrot-fndn/shared/methodologies/bold/matchers';
import { stubDocument } from '@carrot-fndn/shared/methodologies/bold/testing';
import { BoldMethodologySlug } from '@carrot-fndn/shared/methodologies/bold/types';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import { stubRuleInput } from '@carrot-fndn/shared/testing';

import { NoConflictingCertificateOrCreditProcessor } from './no-conflicting-certificate-or-credit.processor';
import { noConflictingCertificateOrCreditTestCases } from './no-conflicting-certificate-or-credit.test-cases';

describe('NoConflictingCertificateOrCreditProcessor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const ruleDataProcessor = new NoConflictingCertificateOrCreditProcessor(
    RECYCLED_ID,
    BoldMethodologySlug.RECYCLING,
  );

  it.each(noConflictingCertificateOrCreditTestCases)(
    'should return $resultStatus when $scenario',
    async ({ documents, massIDAuditDocument, resultComment, resultStatus }) => {
      const allDocuments = [...documents, massIDAuditDocument];

      spyOnDocumentQueryServiceLoad(stubDocument(), allDocuments);

      const ruleInput = stubRuleInput({
        documentId: massIDAuditDocument.id,
      });

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
