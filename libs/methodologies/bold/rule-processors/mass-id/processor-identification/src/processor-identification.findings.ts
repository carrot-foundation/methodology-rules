import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './processor-identification.constants';
import { ProcessorIdentificationProcessorErrors } from './processor-identification.errors';
import { ruleDefinition } from './processor-identification.rule-definition';

export const PROCESSOR_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new ProcessorIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação de a identificação do processador foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a identificação do processador',
    },
    'FAILED.MULTIPLE_EVENTS': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'A MassID tem mais de um evento de ator "Processor"; apenas um é permitido.',
      guidance: 'Envie um único evento de ator "Processor".',
      title: 'Mais de um processador informado',
    },
    'FAILED.NOT_FOUND': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description: 'A MassID não tem evento de ator "Processor".',
      guidance:
        'Envie o evento de ator "Processor" com o participante responsável.',
      title: 'Processador não identificado',
    },
  },
);
