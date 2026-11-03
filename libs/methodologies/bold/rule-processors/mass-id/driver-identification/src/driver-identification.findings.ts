import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './driver-identification.constants';
import { DriverIdentificationProcessorErrors } from './driver-identification.errors';
import { ruleDefinition } from './driver-identification.rule-definition';

export const DRIVER_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new DriverIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação de a identificação do motorista foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a identificação do motorista',
    },
    'FAILED.DRIVER_AND_JUSTIFICATION_PROVIDED': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento "Pick-up" traz o "Driver Identifier" e também a "Driver Identifier Exemption Justification"; apenas um deles é permitido.',
      guidance:
        'Mantenha somente o identificador do motorista ou somente a justificativa de dispensa no evento "Pick-up".',
      title: 'Motorista e justificativa informados juntos',
    },
    'FAILED.MISSING_JUSTIFICATION': {
      category: 'MISSING_DATA',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O tipo de veículo do evento "Pick-up" exige o "Driver Identifier" ou uma "Driver Identifier Exemption Justification", e nenhum dos dois foi informado.',
      guidance:
        'Verifique se o motorista foi registrado na coleta. Informe o identificador do motorista ou a justificativa de dispensa no evento "Pick-up".',
      title: 'Motorista não identificado',
    },
  },
);
