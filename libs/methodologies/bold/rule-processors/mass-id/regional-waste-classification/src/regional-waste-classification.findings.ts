import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './regional-waste-classification.constants';
import { RegionalWasteClassificationProcessorErrors } from './regional-waste-classification.errors';
import { ruleDefinition } from './regional-waste-classification.rule-definition';

export const REGIONAL_WASTE_CLASSIFICATION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new RegionalWasteClassificationProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação de a classificação regional do resíduo foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a classificação regional do resíduo',
    },
    'FAILED.CLASSIFICATION_DESCRIPTION_MISSING': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Local Waste Classification Description" não foi informado.',
      guidance:
        'Informe a descrição da classificação local do resíduo no evento "Pick-up".',
      title: 'Descrição da classificação do resíduo ausente',
    },
    'FAILED.CLASSIFICATION_ID_MISSING': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O "Local Waste Classification ID" não foi informado.',
      guidance:
        'Informe o código da classificação local do resíduo no evento "Pick-up".',
      title: 'Código da classificação do resíduo ausente',
    },
    'FAILED.INVALID_CLASSIFICATION_DESCRIPTION': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Local Waste Classification Description" não corresponde à descrição do código informado.',
      guidance:
        'Envie a descrição exatamente como consta na classificação oficial do código informado.',
      title: 'Descrição da classificação do resíduo não confere',
    },
    'FAILED.INVALID_CLASSIFICATION_ID': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Local Waste Classification ID" não corresponde a um código aceito pela metodologia.',
      guidance:
        'Envie o código de classificação local do resíduo aceito pela metodologia.',
      title: 'Código de classificação do resíduo não aceito',
    },
    'FAILED.INVALID_SUBTYPE_CDM_CODE_MISMATCH': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O subtipo da MassID não corresponde ao código CDM do "Local Waste Classification ID" informado.',
      guidance:
        'Confira o subtipo e o código de classificação local do resíduo enviados na MassID.',
      title: 'Subtipo incompatível com a classificação do resíduo',
    },
    'FAILED.INVALID_SUBTYPE_MAPPING': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O subtipo informado não corresponde a um código CDM válido.',
      guidance: 'Confira o subtipo do resíduo informado na MassID.',
      title: 'Subtipo sem código CDM correspondente',
    },
    'FAILED.UNSUPPORTED_COUNTRY': {
      category: 'METHODOLOGY_REQUIREMENT',
      defaultOwner: 'CARROT',
      description:
        'A classificação local do resíduo só é validada para recicladores no Brasil.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot avalia o caso.',
      title: 'País do reciclador não suportado',
    },
  },
);
