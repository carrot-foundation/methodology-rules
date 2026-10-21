import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { NoConflictingCertificateOrCreditProcessorErrors } from './no-conflicting-certificate-or-credit.processor.errors';
import { ruleDefinition } from './no-conflicting-certificate-or-credit.rule-definition';

export const NO_CONFLICTING_CERTIFICATE_OR_CREDIT_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new NoConflictingCertificateOrCreditProcessorErrors().ERROR_MESSAGE,
  },
  {
    'ERROR.FAILED_BY_ERROR': { defaultOwner: 'CARROT' },
    'ERROR.MASS_ID_DOCUMENT_HAS_A_AUDIT_FOR_SAME_METHODOLOGY_NAME': {
      defaultOwner: 'TO_CONFIRM',
    },
    'ERROR.MASS_ID_DOCUMENT_HAS_A_VALID_CERTIFICATE_DOCUMENT': {
      defaultOwner: 'TO_CONFIRM',
    },
    'ERROR.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT': {
      defaultOwner: 'TO_CONFIRM',
    },
  },
);
