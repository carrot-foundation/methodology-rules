import {
  EXPECTED_SUBTYPE_GUIDANCE,
  WASTE_SUBTYPE_CLASSIFICATION_EVIDENCE_FIELDS,
  type WasteSubtypeClassificationEvidence,
} from '@carrot-fndn/shared/methodologies/bold/utils';
import {
  crossValidationEvidence,
  defineRuleFindings,
} from '@carrot-fndn/shared/rule/result';

import type { ClassificationDescriptionEvidence } from './regional-waste-classification.types';

import { RESULT_COMMENTS } from './regional-waste-classification.constants';
import { RegionalWasteClassificationProcessorErrors } from './regional-waste-classification.errors';
import { ruleDefinition } from './regional-waste-classification.rule-definition';

const subtypeEvidence = WASTE_SUBTYPE_CLASSIFICATION_EVIDENCE_FIELDS.map(
  (field) => crossValidationEvidence<WasteSubtypeClassificationEvidence>(field),
);

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
        'A validação da classificação regional do resíduo foi interrompida por um erro inesperado.',
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
      evidence: [
        crossValidationEvidence<ClassificationDescriptionEvidence>(
          'localWasteClassificationId',
        ),
        crossValidationEvidence<ClassificationDescriptionEvidence>(
          'expectedDescription',
        ),
      ],
      guidance:
        'Envie no evento "Pick-up" a descrição indicada em "expectedDescription", que é a descrição oficial do código informado.',
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
      evidence: subtypeEvidence,
      guidance: EXPECTED_SUBTYPE_GUIDANCE,
      title: 'Subtipo incompatível com a classificação do resíduo',
    },
    'FAILED.INVALID_SUBTYPE_MAPPING': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O subtipo informado não corresponde a um código CDM válido.',
      evidence: subtypeEvidence,
      guidance: EXPECTED_SUBTYPE_GUIDANCE,
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
