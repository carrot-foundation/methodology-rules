import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './participant-accreditations-and-verifications-requirements.constants';
import { ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors } from './participant-accreditations-and-verifications-requirements.errors';
import { ruleDefinition } from './participant-accreditations-and-verifications-requirements.rule-definition';

export const PARTICIPANT_ACCREDITATIONS_AND_VERIFICATIONS_REQUIREMENTS_FINDINGS =
  defineRuleFindings(
    ruleDefinition.slug,
    {
      ERROR:
        new ParticipantAccreditationsAndVerificationsRequirementsProcessorErrors()
          .ERROR_MESSAGE,
      FAILED: RESULT_COMMENTS.failed,
      REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
    },
    {
      'ERROR.ACCREDITATION_DOCUMENTS_NOT_FOUND': {
        category: 'ACCREDITATION',
        defaultOwner: 'TO_CONFIRM',
        description:
          'Nenhum documento de credenciamento foi encontrado para a MassID.',
        guidance:
          'Confirme que os participantes da massa estão credenciados e referenciados corretamente. A Carrot confirma a origem da pendência.',
        title: 'Credenciamentos não encontrados',
      },
      'ERROR.FAILED_BY_ERROR': {
        category: 'PROCESSING_ERROR',
        defaultOwner: 'CARROT',
        description:
          'A validação de os credenciamentos dos participantes foi interrompida por um erro inesperado.',
        guidance:
          'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
        title: 'Falha ao validar os credenciamentos dos participantes',
      },
      'ERROR.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_EVENTS': {
        category: 'MISSING_EVENT',
        defaultOwner: 'INTEGRATOR',
        description: 'A MassID não tem nenhum evento.',
        guidance: 'Envie a MassID com os eventos da cadeia de custódia.',
        title: 'MassID sem eventos',
      },
      'ERROR.MASS_ID_DOCUMENT_NOT_FOUND': {
        category: 'PROCESSING_ERROR',
        defaultOwner: 'CARROT',
        description:
          'O documento da MassID não foi encontrado durante a validação.',
        guidance:
          'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
        title: 'Documento da MassID não encontrado',
      },
      'ERROR.MISSING_PARTICIPANTS_ACCREDITATION_DOCUMENTS': {
        category: 'ACCREDITATION',
        defaultOwner: 'TO_CONFIRM',
        description:
          'Um ou mais participantes da MassID não têm credenciamento válido.',
        guidance:
          'Confirme que todos os participantes da massa estão credenciados. A Carrot confirma a origem da pendência.',
        title: 'Participantes sem credenciamento válido',
      },
      'ERROR.MULTIPLE_VALID_ACCREDITATIONS_FOR_PARTICIPANT': {
        category: 'ACCREDITATION',
        defaultOwner: 'INTEGRATOR',
        description:
          'Um participante tem mais de um credenciamento válido para o mesmo papel.',
        guidance:
          'Confira o participante referenciado na MassID e informe à Carrot qual credenciamento se aplica.',
        title: 'Participante com mais de um credenciamento válido',
      },
    },
  );
