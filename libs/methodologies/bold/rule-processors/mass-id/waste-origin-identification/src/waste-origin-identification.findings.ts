import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './waste-origin-identification.constants';
import { WasteOriginIdentificationProcessorErrors } from './waste-origin-identification.errors';
import { ruleDefinition } from './waste-origin-identification.rule-definition';

export const WASTE_ORIGIN_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new WasteOriginIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação da origem do resíduo foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a origem do resíduo',
    },
    'FAILED.MISSING_PICK_UP_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description: 'O MassID não tem o evento "Pick-up".',
      guidance: 'Envie o evento "Pick-up" registrando a coleta da massa.',
      title: 'Evento de coleta ausente',
    },
    'FAILED.MISSING_WASTE_GENERATOR_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'O MassID não tem evento de ator "Waste Generator" e a origem do resíduo não está declarada como "Unidentified".',
      guidance:
        'Envie o evento de ator "Waste Generator" ou declare a origem do resíduo como "Unidentified".',
      title: 'Gerador não identificado',
    },
    'FAILED.MULTIPLE_WASTE_GENERATOR_EVENTS': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O MassID tem mais de um evento de ator "Waste Generator"; apenas um é permitido.',
      guidance: 'Envie um único evento de ator "Waste Generator".',
      title: 'Mais de um gerador informado',
    },
    'FAILED.WASTE_ORIGIN_CONFLICT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O MassID tem evento de ator "Waste Generator", mas a origem do resíduo está declarada como "Unidentified".',
      guidance:
        'Remova o gerador ou corrija a origem do resíduo, conforme o que aconteceu na coleta.',
      title: 'Gerador informado com origem não identificada',
    },
  },
);
