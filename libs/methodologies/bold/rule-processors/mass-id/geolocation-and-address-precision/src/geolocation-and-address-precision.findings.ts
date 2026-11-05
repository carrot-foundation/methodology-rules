import { MassIDActorType } from '@carrot-fndn/shared/methodologies/bold/types';
import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import { RESULT_COMMENTS } from './geolocation-and-address-precision.constants';
import { GeolocationAndAddressPrecisionProcessorErrors } from './geolocation-and-address-precision.errors';
import { ruleDefinition } from './geolocation-and-address-precision.rule-definition';

export const GEOLOCATION_AND_ADDRESS_PRECISION_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new GeolocationAndAddressPrecisionProcessorErrors().ERROR_MESSAGE,
    FAILED: RESULT_COMMENTS.failed,
    REVIEW_REQUIRED: RESULT_COMMENTS.reviewRequired,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação da geolocalização e o endereço foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a geolocalização e o endereço',
    },
    'ERROR.MASS_ID_AUDIT_DOCUMENT_NOT_FOUND': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'O documento "MassID Audit" não foi encontrado durante a validação.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Documento de auditoria não encontrado',
    },
    'ERROR.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'O MassID não tem os eventos "Pick-up" e "Drop-off" exigidos para validar endereços.',
      guidance:
        'Envie os eventos "Pick-up" e "Drop-off" com os respectivos endereços.',
      title: 'Eventos de coleta ou recebimento ausentes',
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
    'ERROR.PARTICIPANT_ACCREDITATION_DOCUMENTS_NOT_FOUND': {
      category: 'ACCREDITATION',
      defaultOwner: 'TO_CONFIRM',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
      description:
        'Nenhum documento de credenciamento foi encontrado para os participantes do MassID.',
      guidance:
        'Confirme que os participantes da massa estão credenciados e que a massa os referencia corretamente. A Carrot confirma a origem da pendência.',
      title: 'Credenciamentos dos participantes não encontrados',
    },
    'FAILED.FAILED_ADDRESS_SIMILARITY': {
      category: 'LOCATION',
      defaultOwner: 'INTEGRATOR',
      description:
        'Os dados do endereço do evento têm similaridade abaixo do limite em relação ao endereço da unidade credenciada.',
      guidance:
        'Envie o evento com o endereço da unidade credenciada do participante, incluindo as coordenadas.',
      title: 'Endereço do evento não confere com o credenciado',
    },
    'FAILED.FAILED_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES': {
      category: 'LOCATION',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento não traz coordenadas e os dados do endereço têm similaridade abaixo do limite em relação ao endereço credenciado.',
      guidance:
        'Envie o evento com o endereço da unidade credenciada do participante, incluindo latitude e longitude.',
      title: 'Endereço do evento não confere com o credenciado',
    },
    'FAILED.INVALID_ACTOR_TYPE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'Não foi possível identificar o tipo de ator do evento avaliado.',
      guidance: 'Confira o rótulo do evento de ator enviado no MassID.',
      title: 'Tipo de ator não identificado',
    },
    'FAILED.INVALID_ADDRESS_DISTANCE': {
      category: 'LOCATION',
      defaultOwner: 'INTEGRATOR',
      description:
        'A distância entre as coordenadas do endereço do evento e as da unidade credenciada passa de 30 km.',
      guidance:
        'Confira o endereço e as coordenadas do evento e envie os dados da unidade credenciada que participou da operação.',
      title: 'Endereço do evento distante do credenciado',
    },
    'FAILED.INVALID_GPS_DISTANCE': {
      category: 'LOCATION',
      defaultOwner: 'INTEGRATOR',
      description:
        'As coordenadas de GPS capturadas no evento estão a mais de 2 km da unidade credenciada.',
      guidance:
        'Confira se o GPS foi capturado na unidade do participante e corrija a captura.',
      title: 'GPS capturado distante da unidade credenciada',
    },
    'FAILED.INVALID_GPS_DISTANCE_NO_EVENT_COORDINATES': {
      category: 'LOCATION',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento não traz coordenadas de endereço e o GPS capturado está a mais de 2 km da unidade credenciada.',
      guidance:
        'Envie as coordenadas do endereço do evento e confira se o GPS foi capturado na unidade do participante.',
      title: 'GPS capturado distante da unidade credenciada',
    },
    'FAILED.MISMATCHED_COUNTRY_OR_STATE': {
      category: 'LOCATION',
      defaultOwner: 'INTEGRATOR',
      description:
        'O país ou o estado do endereço do evento não é o mesmo da unidade credenciada.',
      guidance:
        'Confira o país e o estado do endereço do evento e envie os dados da unidade credenciada.',
      title: 'País ou estado diverge do credenciado',
    },
    'FAILED.MISMATCHED_COUNTRY_OR_STATE_NO_EVENT_COORDINATES': {
      category: 'LOCATION',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento não traz coordenadas e o país ou o estado do endereço não é o mesmo da unidade credenciada.',
      guidance:
        'Confira o país e o estado do endereço do evento e envie também as coordenadas.',
      title: 'País ou estado diverge do credenciado',
    },
    'FAILED.MISSING_ACCREDITATION_ADDRESS': {
      category: 'ACCREDITATION',
      defaultOwner: 'CARROT',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
      description:
        'Nenhum endereço credenciado foi encontrado para o ator avaliado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot completa o endereço no credenciamento.',
      title: 'Credenciamento sem endereço',
    },
    'FAILED.MISSING_ACCREDITED_ADDRESS_COORDINATES': {
      category: 'ACCREDITATION',
      defaultOwner: 'CARROT',
      dependsOnAccreditation: MassIDActorType.RECYCLER,
      description:
        'O endereço credenciado não tem latitude ou longitude, necessárias para validar a distância.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot completa as coordenadas no credenciamento.',
      title: 'Endereço credenciado sem coordenadas',
    },
    'REVIEW_REQUIRED.REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY': {
      category: 'LOCATION',
      defaultOwner: 'TO_CONFIRM',
      description:
        'A distância do endereço do evento foi aceita, mas os dados do endereço diferem parcialmente do credenciado.',
      guidance:
        'Confira se o endereço enviado é o da unidade credenciada. A Carrot revisa a divergência e confirma a origem.',
      title: 'Endereço do evento exige revisão',
    },
    'REVIEW_REQUIRED.REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES':
      {
        category: 'LOCATION',
        defaultOwner: 'TO_CONFIRM',
        description:
          'O evento não traz coordenadas e os dados do endereço diferem parcialmente do credenciado.',
        guidance:
          'Envie as coordenadas do endereço do evento. A Carrot revisa a divergência e confirma a origem.',
        title: 'Endereço do evento exige revisão',
      },
  },
);
