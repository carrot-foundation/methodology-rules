import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './mass-id-qualifications.constants';
import { MassIDQualificationsProcessorErrors } from './mass-id-qualifications.errors';
import { ruleDefinition } from './mass-id-qualifications.rule-definition';

export const MASS_ID_QUALIFICATIONS_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new MassIDQualificationsProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.DOCUMENT_SUBTYPE_NOT_FOUND': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'A MassID não informa o subtipo do resíduo.',
      guidance: 'Informe o subtipo do resíduo na MassID.',
      title: 'Subtipo da massa ausente',
    },
    'ERROR.DOCUMENT_TYPE_NOT_FOUND': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'A MassID não informa o tipo do resíduo.',
      guidance: 'Informe o tipo do resíduo na MassID.',
      title: 'Tipo da massa ausente',
    },
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação de as qualificações da massa foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar as qualificações da massa',
    },
    'FAILED.INVALID_CATEGORY': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'A categoria do documento não é "MassID".',
      guidance: 'Envie o documento com a categoria "MassID".',
      title: 'Categoria do documento inválida',
    },
    'FAILED.INVALID_MEASUREMENT_UNIT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'A unidade de medida da MassID não é "kg".',
      guidance: 'Envie a quantidade da massa em quilogramas ("kg").',
      title: 'Unidade de medida inválida',
    },
    'FAILED.INVALID_SUBTYPE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O subtipo informado não está entre os aceitos pela metodologia.',
      guidance:
        'Confira o subtipo do resíduo e envie um dos valores aceitos pela metodologia.',
      title: 'Subtipo do resíduo não aceito',
    },
    'FAILED.INVALID_TYPE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O tipo do documento não é "Organic".',
      guidance:
        'Envie a MassID com o tipo "Organic" se o resíduo for orgânico; outros tipos não são elegíveis.',
      title: 'Tipo do resíduo não aceito',
    },
    'FAILED.INVALID_VALUE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'A quantidade da MassID não é maior que zero.',
      guidance: 'Envie a quantidade da massa em kg, maior que zero.',
      title: 'Quantidade da massa inválida',
    },
  },
);
