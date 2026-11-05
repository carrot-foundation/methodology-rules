import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './vehicle-identification.constants';
import { VehicleIdentificationProcessorErrors } from './vehicle-identification.errors';
import { ruleDefinition } from './vehicle-identification.rule-definition';

export const VEHICLE_IDENTIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new VehicleIdentificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação da identificação do veículo foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a identificação do veículo',
    },
    'FAILED.INVALID_LICENSE_PLATE_FORMAT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Vehicle License Plate" do evento "Pick-up" não está em um formato válido.',
      guidance:
        'Envie a placa do veículo no formato oficial, sem caracteres extras.',
      title: 'Placa do veículo em formato inválido',
    },
    'FAILED.INVALID_VEHICLE_TYPE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Vehicle Type" do evento "Pick-up" não é aceito pela metodologia.',
      guidance: 'Envie um dos tipos de veículo aceitos pela metodologia.',
      title: 'Tipo de veículo não aceito',
    },
    'FAILED.LICENSE_PLATE_MISSING': {
      category: 'MISSING_DATA',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O tipo de veículo do evento "Pick-up" exige o "Vehicle License Plate", que não foi informado.',
      guidance:
        'Verifique se a placa foi registrada na coleta e informe-a no evento "Pick-up". A Carrot confirma a origem da pendência.',
      title: 'Placa do veículo ausente',
    },
    'FAILED.PICK_UP_EVENT_MISSING': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description: 'O MassID não tem o evento "Pick-up".',
      guidance: 'Envie o evento "Pick-up" registrando a coleta da massa.',
      title: 'Evento de coleta ausente',
    },
    'FAILED.VEHICLE_DESCRIPTION_MISSING': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O tipo de veículo do evento "Pick-up" exige a "Vehicle Description", que não foi informada.',
      guidance: 'Inclua a "Vehicle Description" no evento "Pick-up".',
      title: 'Descrição do veículo ausente',
    },
    'FAILED.VEHICLE_TYPE_MISSING': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O evento "Pick-up" não informa o "Vehicle Type".',
      guidance: 'Inclua o "Vehicle Type" no evento "Pick-up".',
      title: 'Tipo de veículo ausente',
    },
  },
);
