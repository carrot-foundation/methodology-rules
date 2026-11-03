import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './hauler-identification.constants';
import { HaulerIdentificationProcessorErrors } from './hauler-identification.errors';
import { ruleDefinition } from './hauler-identification.rule-definition';

export const HAULER_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new HaulerIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação da identificação do transportador foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a identificação do transportador',
    },
    'FAILED.HAULER_EVENT_MISSING': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'O tipo de veículo do evento "Pick-up" exige um evento de ator "Hauler", que não foi enviado.',
      guidance:
        'Envie o evento de ator "Hauler" com o transportador responsável pela coleta.',
      title: 'Transportador não identificado',
    },
    'FAILED.PICK_UP_EVENT_MISSING': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description: 'A MassID não tem o evento "Pick-up".',
      guidance: 'Envie o evento "Pick-up" registrando a coleta da massa.',
      title: 'Evento de coleta ausente',
    },
  },
);
