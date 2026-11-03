import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './project-period-limit.constants';
import { ProjectPeriodLimitProcessorErrors } from './project-period-limit.errors';
import { ruleDefinition } from './project-period-limit.rule-definition';

export const PROJECT_PERIOD_LIMIT_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new ProjectPeriodLimitProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação do período do projeto foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar o período do projeto',
    },
    'FAILED.INVALID_RECYCLED_EVENT_DATE': {
      category: 'METHODOLOGY_REQUIREMENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento "Recycled" ocorreu antes do primeiro dia do ano anterior (UTC).',
      guidance:
        'Confira a data do evento "Recycled". Se estiver correta, a massa está fora do período elegível.',
      title: 'Reciclagem fora do período do projeto',
    },
    'FAILED.MISSING_RECYCLED_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description: 'A MassID não tem o evento "Recycled".',
      guidance:
        'Envie o evento "Recycled" com a data de conclusão da reciclagem.',
      title: 'Evento de reciclagem ausente',
    },
  },
);
