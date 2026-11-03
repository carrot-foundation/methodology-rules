import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './no-conflicting-certificate-or-credit.constants';
import { NoConflictingCertificateOrCreditProcessorErrors } from './no-conflicting-certificate-or-credit.processor.errors';
import { ruleDefinition } from './no-conflicting-certificate-or-credit.rule-definition';

export const NO_CONFLICTING_CERTIFICATE_OR_CREDIT_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new NoConflictingCertificateOrCreditProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação de a ausência de certificado ou crédito em conflito foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title:
        'Falha ao validar a ausência de certificado ou crédito em conflito',
    },
    'ERROR.MASS_ID_DOCUMENT_HAS_A_AUDIT_FOR_SAME_METHODOLOGY_NAME': {
      category: 'DUPLICATE_OR_CONFLICT',
      defaultOwner: 'TO_CONFIRM',
      description:
        'A MassID já tem uma auditoria vinculada para a mesma metodologia.',
      guidance:
        'Nenhum reenvio é necessário. A Carrot confirma se a auditoria anterior é válida.',
      title: 'Massa já auditada nesta metodologia',
    },
    'ERROR.MASS_ID_DOCUMENT_HAS_A_VALID_CERTIFICATE_DOCUMENT': {
      category: 'DUPLICATE_OR_CONFLICT',
      defaultOwner: 'TO_CONFIRM',
      description: 'A MassID já está vinculada a um certificado válido.',
      guidance:
        'Nenhum reenvio é necessário. A Carrot confirma o vínculo existente.',
      title: 'Massa já vinculada a um certificado',
    },
    'ERROR.MASS_ID_DOCUMENT_HAS_A_VALID_CREDIT_DOCUMENT': {
      category: 'DUPLICATE_OR_CONFLICT',
      defaultOwner: 'TO_CONFIRM',
      description: 'A MassID já está vinculada a um documento "Credit Order".',
      guidance:
        'Nenhum reenvio é necessário. A Carrot confirma o vínculo existente.',
      title: 'Massa já vinculada a um crédito',
    },
  },
);
