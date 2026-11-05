import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './drop-off-at-recycler.constants';
import { DropOffAtRecyclerProcessorErrors } from './drop-off-at-recycler.errors';
import { ruleDefinition } from './drop-off-at-recycler.rule-definition';

export const DROP_OFF_AT_RECYCLER_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new DropOffAtRecyclerProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação do recebimento no reciclador foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar o recebimento no reciclador',
    },
    'FAILED.ADDRESS_MISMATCH': {
      category: 'LOCATION',
      defaultOwner: 'INTEGRATOR',
      description:
        'O endereço do evento "Drop-off" não é o mesmo do evento de ator "Recycler".',
      guidance:
        'Envie o evento "Drop-off" com o endereço da unidade do reciclador que recebeu a massa.',
      title: 'Endereço de recebimento diverge do reciclador',
    },
    'FAILED.MISSING_DROP_OFF_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description: 'O MassID não tem o evento "Drop-off".',
      guidance:
        'Envie o evento "Drop-off" registrando o recebimento da massa no reciclador.',
      title: 'Evento de recebimento ausente',
    },
    'FAILED.MISSING_RECEIVING_OPERATOR_IDENTIFIER': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento "Drop-off" não informa o "Receiving Operator Identifier".',
      guidance:
        'Inclua o "Receiving Operator Identifier" no evento "Drop-off".',
      title: 'Operador de recebimento não identificado',
    },
  },
);
