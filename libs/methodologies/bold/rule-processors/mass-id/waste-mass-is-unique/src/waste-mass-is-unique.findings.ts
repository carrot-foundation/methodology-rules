import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './waste-mass-is-unique.constants';
import { WasteMassIsUniqueProcessorErrors } from './waste-mass-is-unique.errors';
import { ruleDefinition } from './waste-mass-is-unique.rule-definition';

export const WASTE_MASS_IS_UNIQUE_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new WasteMassIsUniqueProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação da unicidade da massa foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a unicidade da massa',
    },
    'ERROR.MASS_ID_DOCUMENT_NOT_FOUND': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'O documento do MassID não foi encontrado durante a validação.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Documento do MassID não encontrado',
    },
    'ERROR.MISSING_DROP_OFF_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'A unicidade da massa não pôde ser verificada porque o MassID não tem o evento "Drop-off".',
      guidance: 'Envie o evento "Drop-off" da massa.',
      title: 'Evento de recebimento ausente',
    },
    'ERROR.MISSING_PICK_UP_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'A unicidade da massa não pôde ser verificada porque o MassID não tem o evento "Pick-up".',
      guidance: 'Envie o evento "Pick-up" da massa.',
      title: 'Evento de coleta ausente',
    },
    'ERROR.MISSING_RECYCLER_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'A unicidade da massa não pôde ser verificada porque o MassID não tem o evento de ator "Recycler".',
      guidance: 'Envie o evento de ator "Recycler" da massa.',
      title: 'Reciclador não identificado',
    },
    'ERROR.MISSING_VEHICLE_LICENSE_PLATE': {
      category: 'MISSING_DATA',
      defaultOwner: 'TO_CONFIRM',
      description:
        'A unicidade da massa não pôde ser verificada porque a placa do veículo não foi informada.',
      guidance:
        'Verifique se a placa foi registrada na coleta e informe-a no evento "Pick-up".',
      title: 'Placa do veículo ausente',
    },
    'ERROR.MISSING_WASTE_GENERATOR_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'A unicidade da massa não pôde ser verificada porque o MassID não tem o evento de ator "Waste Generator".',
      guidance: 'Envie o evento de ator "Waste Generator" da massa.',
      title: 'Gerador não identificado',
    },
    'FAILED.VALID_DUPLICATE_FOUND': {
      category: 'DUPLICATE_OR_CONFLICT',
      defaultOwner: 'TO_CONFIRM',
      description:
        'Foram encontrados outros MassIDs semelhantes que não estão cancelados.',
      guidance:
        'Confira se a massa foi enviada mais de uma vez e cancele as duplicatas.',
      title: 'Possível massa duplicada',
    },
  },
);
