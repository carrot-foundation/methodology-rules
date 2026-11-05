import { MassIDActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import { ruleDefinition } from './prevented-emissions.rule-definition';

export const PREVENTED_EMISSIONS_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new PreventedEmissionsProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação das emissões evitadas foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar as emissões evitadas',
    },
    'ERROR.INVALID_BASELINES': {
      category: 'ACCREDITATION',
      defaultOwner: 'RECYCLER',
      description:
        'O credenciamento do reciclador não tem linhas de base ("Baselines") válidas.',
      guidance:
        'Oriente o reciclador a atualizar as linhas de base no credenciamento.',
      title: 'Linhas de base inválidas no credenciamento',
    },
    'ERROR.INVALID_CLASSIFICATION_ID': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Local Waste Classification ID" não corresponde a um código aceito pela metodologia.',
      guidance:
        'Envie o código de classificação local do resíduo aceito pela metodologia.',
      title: 'Código de classificação do resíduo não aceito',
    },
    'ERROR.INVALID_MASS_ID_DOCUMENT_SUBTYPE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O subtipo da MassID não é válido para o cálculo de emissões evitadas.',
      guidance: 'Confira o subtipo do resíduo informado na MassID.',
      title: 'Subtipo da massa inválido',
    },
    'ERROR.INVALID_RULE_SUBJECT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'Os dados da MassID não atendem à estrutura exigida para calcular as emissões evitadas.',
      guidance:
        'Confira os eventos e atributos da MassID usados no cálculo de emissões evitadas.',
      title: 'Dados da massa insuficientes para o cálculo',
    },
    'ERROR.MISSING_GREENHOUSE_GAS_TYPE': {
      category: 'ACCREDITATION',
      defaultOwner: 'RECYCLER',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
      description:
        'O credenciamento do reciclador não informa um tipo de gás de efeito estufa válido.',
      guidance:
        'Oriente o reciclador a atualizar o credenciamento com o tipo de gás de efeito estufa.',
      title: 'Tipo de gás de efeito estufa ausente',
    },
    'ERROR.MISSING_MASS_ID_DOCUMENT': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'O documento da MassID não foi encontrado durante a validação.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Documento da MassID não encontrado',
    },
    'ERROR.MISSING_RECYCLER_ACCREDITATION_DOCUMENT': {
      category: 'ACCREDITATION',
      defaultOwner: 'TO_CONFIRM',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
      description:
        'O documento de credenciamento do reciclador não foi encontrado.',
      guidance:
        'Confirme que o reciclador da massa está credenciado e referenciado corretamente. A Carrot confirma a origem da pendência.',
      title: 'Credenciamento do reciclador não encontrado',
    },
    'ERROR.SUBTYPE_CDM_CODE_MISMATCH': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Local Waste Classification ID" não corresponde ao código CDM 8.7D ("Others if organic").',
      guidance:
        'Confira o código de classificação local e o subtipo do resíduo enviados na MassID.',
      title: 'Código de classificação incompatível com o subtipo',
    },
    'FAILED.MISSING_EXCEEDING_EMISSION_COEFFICIENT': {
      category: 'ACCREDITATION',
      defaultOwner: 'RECYCLER',
      description:
        'O credenciamento do reciclador não tem um "Exceeding Emission Coefficient (per ton)" válido.',
      guidance:
        'Oriente o reciclador a atualizar o credenciamento com o coeficiente de emissão excedente.',
      title: 'Coeficiente de emissão excedente ausente',
    },
    'FAILED.MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE': {
      category: 'ACCREDITATION',
      defaultOwner: 'RECYCLER',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
      description:
        'O credenciamento do reciclador não tem linha de base válida para o subtipo do resíduo.',
      guidance:
        'Oriente o reciclador a incluir no credenciamento a linha de base do subtipo.',
      title: 'Linha de base ausente para o subtipo',
    },
    'FAILED.OTHERS_IF_ORGANIC_NO_CARBON_FRACTION': {
      category: 'METHODOLOGY_REQUIREMENT',
      defaultOwner: 'RECYCLER',
      description:
        'Não há fração de carbono definida para o código de classificação "Others (if organic)" nem fração válida registrada para o gerador.',
      guidance:
        'Oriente o reciclador a providenciar o laudo de fração de carbono do gerador.',
      title: 'Fração de carbono indisponível',
    },
    'REVIEW_REQUIRED.OTHERS_IF_ORGANIC_AWAITING_LAUDO': {
      category: 'METHODOLOGY_REQUIREMENT',
      defaultOwner: 'RECYCLER',
      description:
        'Não há fração de carbono disponível para o código "Others (if organic)"; o cálculo aguarda o laudo.',
      guidance:
        'Oriente o reciclador a enviar o laudo de fração de carbono do gerador.',
      title: 'Fração de carbono aguardando laudo',
    },
    'REVIEW_REQUIRED.OTHERS_IF_ORGANIC_EXPIRED_FRACTION': {
      category: 'METHODOLOGY_REQUIREMENT',
      defaultOwner: 'RECYCLER',
      description:
        'A fração de carbono registrada para o gerador venceu: o laudo tem validade de 2 anos a partir da análise.',
      guidance:
        'Oriente o reciclador a enviar um novo laudo de fração de carbono do gerador.',
      title: 'Fração de carbono vencida',
    },
  },
);
