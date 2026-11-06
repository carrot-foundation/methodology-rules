import { MassIDActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  crossValidationEvidence,
  defineRuleFindings,
  EVIDENCE_FIELD_LABELS,
} from '@carrot-fndn/shared/rule/result';

import type {
  DeductedWeightEvidence,
  SortingValueEvidence,
} from './mass-id-sorting.types';

import { RESULT_COMMENTS } from './mass-id-sorting.constants';
import { MassIDSortingProcessorErrors } from './mass-id-sorting.errors';
import { ruleDefinition } from './mass-id-sorting.rule-definition';

export const MASS_ID_SORTING_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new MassIDSortingProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação da triagem da massa foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a triagem da massa',
    },
    'ERROR.INVALID_DEDUCTED_WEIGHT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Deducted Weight" do evento "Sorting" está ausente ou não é maior que zero.',
      guidance:
        'Informe o "Deducted Weight" do evento "Sorting" em kg, maior que zero.',
      title: 'Peso descontado inválido',
    },
    'ERROR.INVALID_DEDUCTED_WEIGHT_FORMAT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O formato do "Deducted Weight" do evento "Sorting" não é KILOGRAM.',
      guidance: 'Envie o "Deducted Weight" com o formato KILOGRAM.',
      title: 'Formato do peso descontado inválido',
    },
    'ERROR.INVALID_GROSS_WEIGHT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Gross Weight" do evento "Sorting" está ausente ou não é maior que zero.',
      guidance:
        'Informe o "Gross Weight" do evento "Sorting" em kg, maior que zero.',
      title: 'Peso bruto da triagem inválido',
    },
    'ERROR.INVALID_GROSS_WEIGHT_FORMAT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O formato do "Gross Weight" do evento "Sorting" não é KILOGRAM.',
      guidance: 'Envie o "Gross Weight" com o formato KILOGRAM.',
      title: 'Formato do peso bruto da triagem inválido',
    },
    'ERROR.INVALID_VALUE_AFTER_SORTING': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'A quantidade da massa após o evento "Sorting" não é maior que zero.',
      guidance:
        'Confira o valor do evento "Sorting" e envie a quantidade triada em kg, maior que zero.',
      title: 'Quantidade após a triagem inválida',
    },
    'ERROR.INVALID_VALUE_BEFORE_SORTING': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'A quantidade da massa antes do evento "Sorting" não é maior que zero.',
      guidance:
        'Confira o valor do evento anterior ao "Sorting" e envie a quantidade em kg, maior que zero.',
      title: 'Quantidade antes da triagem inválida',
    },
    'ERROR.INVALID_WEIGHT_COMPARISON': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Deducted Weight" do evento "Sorting" não é menor que o "Gross Weight".',
      guidance:
        'Confira os pesos do evento "Sorting": o peso descontado deve ser menor que o peso bruto.',
      title: 'Peso descontado maior que o peso bruto',
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
    'ERROR.MISSING_EXTERNAL_EVENTS': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description: 'O MassID não tem nenhum evento.',
      guidance: 'Envie o MassID com os eventos da cadeia de custódia.',
      title: 'MassID sem eventos',
    },
    'ERROR.MISSING_RECYCLER_ACCREDITATION_DOCUMENT': {
      category: 'ACCREDITATION',
      defaultOwner: 'TO_CONFIRM',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
      description:
        'O documento de credenciamento do reciclador não foi encontrado.',
      guidance:
        'Confirme que o reciclador da massa está credenciado e referenciado corretamente, e corrija na origem o que estiver errado.',
      title: 'Credenciamento do reciclador não encontrado',
    },
    'ERROR.MISSING_SORTING_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description: 'O MassID não tem o evento "Sorting".',
      guidance: 'Envie o evento "Sorting" com os pesos da triagem.',
      title: 'Evento de triagem ausente',
    },
    'ERROR.MISSING_SORTING_FACTOR': {
      category: 'ACCREDITATION',
      defaultOwner: 'RECYCLER',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
      description:
        'O credenciamento do reciclador não informa o "Sorting Factor".',
      guidance:
        'Oriente o reciclador a atualizar o credenciamento com o fator de triagem.',
      title: 'Fator de triagem ausente no credenciamento',
    },
    'FAILED.DEDUCTED_WEIGHT_MISMATCH': {
      category: 'METHODOLOGY_REQUIREMENT',
      defaultOwner: 'INTEGRATOR',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
      description:
        'O "Deducted Weight" difere em mais de 0,1 kg do "Gross Weight" multiplicado pelo fator de triagem credenciado.',
      evidence: [
        crossValidationEvidence<DeductedWeightEvidence>('deductedWeight'),
        crossValidationEvidence<DeductedWeightEvidence>(
          'expectedDeductedWeight',
        ),
      ],
      guidance: `Envie no evento "Sorting" o "Deducted Weight" indicado em "${EVIDENCE_FIELD_LABELS.expectedDeductedWeight}" (kg, com 3 casas decimais), que é o "Gross Weight" multiplicado pelo fator de triagem credenciado do reciclador, e mantenha o valor do evento "Sorting" e a quantidade do MassID iguais ao "Gross Weight" menos o "Deducted Weight".`,
      title: 'Peso descontado não confere com o fator de triagem',
    },
    'FAILED.DOCUMENT_VALUE_MISMATCH': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'A quantidade atual do MassID não é igual ao valor do evento "Sorting".',
      guidance:
        'Envie a quantidade do MassID igual ao valor resultante do evento "Sorting".',
      title: 'Quantidade do MassID diverge da triagem',
    },
    'FAILED.GROSS_WEIGHT_MISMATCH': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Gross Weight" do evento "Sorting" difere em mais de 0,1 kg do valor do evento anterior.',
      guidance:
        'Envie o "Gross Weight" da triagem igual ao valor do evento anterior.',
      title: 'Peso bruto da triagem diverge do evento anterior',
    },
    'FAILED.MISSING_SORTING_DESCRIPTION': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O evento "Sorting" não tem "Description".',
      guidance: 'Inclua a "Description" no evento "Sorting".',
      title: 'Descrição da triagem ausente',
    },
    'FAILED.SORTING_VALUE_EXCEEDS_TOLERANCE': {
      category: 'METHODOLOGY_REQUIREMENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'O valor calculado da triagem difere do valor declarado em mais de 0,1 kg.',
      evidence: [
        crossValidationEvidence<SortingValueEvidence>('sortingValue'),
        crossValidationEvidence<SortingValueEvidence>('expectedSortingValue'),
      ],
      guidance: `Envie como valor do evento "Sorting", e como quantidade do MassID, o indicado em "${EVIDENCE_FIELD_LABELS.expectedSortingValue}" (kg, com 3 casas decimais), que é o "Gross Weight" menos o "Deducted Weight" declarados.`,
      title: 'Valor triado fora da tolerância',
    },
  },
);
