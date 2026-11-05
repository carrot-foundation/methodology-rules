import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './recycler-identification.constants';
import { RecyclerIdentificationProcessorErrors } from './recycler-identification.errors';
import { ruleDefinition } from './recycler-identification.rule-definition';

export const RECYCLER_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new RecyclerIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação da identificação do reciclador foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a identificação do reciclador',
    },
    'FAILED.MULTIPLE_EVENTS': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O MassID tem mais de um evento de ator "Recycler"; apenas um é permitido.',
      guidance: 'Envie um único evento de ator "Recycler".',
      title: 'Mais de um reciclador informado',
    },
    'FAILED.NOT_FOUND': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description: 'O MassID não tem evento de ator "Recycler".',
      guidance:
        'Envie o evento de ator "Recycler" com o participante responsável.',
      title: 'Reciclador não identificado',
    },
  },
);
