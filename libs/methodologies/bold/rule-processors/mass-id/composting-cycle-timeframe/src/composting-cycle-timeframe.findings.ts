import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './composting-cycle-timeframe.constants';
import { CompostingCycleTimeframeProcessorErrors } from './composting-cycle-timeframe.errors';
import { ruleDefinition } from './composting-cycle-timeframe.rule-definition';

export const COMPOSTING_CYCLE_TIMEFRAME_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new CompostingCycleTimeframeProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação do ciclo de compostagem foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar o ciclo de compostagem',
    },
    'FAILED.MISSING_DROP_OFF_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'O ciclo de compostagem não pôde ser verificado porque o MassID não tem o evento "Drop-off".',
      guidance:
        'Envie o evento "Drop-off" com a data de recebimento da massa no reciclador.',
      title: 'Evento de recebimento ausente',
    },
    'FAILED.MISSING_RECYCLED_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'O ciclo de compostagem não pôde ser verificado porque o MassID não tem o evento "Recycled".',
      guidance:
        'Envie o evento "Recycled" com a data de conclusão da reciclagem.',
      title: 'Evento de reciclagem ausente',
    },
    'FAILED.TIMEFRAME_OUT_OF_RANGE': {
      category: 'METHODOLOGY_REQUIREMENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'O intervalo entre os eventos "Drop-off" e "Recycled" está fora da faixa aceita pela metodologia (60 a 180 dias).',
      guidance:
        'Confira as datas dos eventos "Drop-off" e "Recycled". Se estiverem incorretas, corrija-as; se estiverem corretas, a massa não atende ao requisito.',
      title: 'Ciclo de compostagem fora do prazo',
    },
  },
);
