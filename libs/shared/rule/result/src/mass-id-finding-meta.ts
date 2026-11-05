import { MassIDActorType } from '@carrot-fndn/shared/methodologies/bold/types';

import type { FindingMeta } from './rule-findings';

export const MASS_ID_DOCUMENT_NOT_FOUND_META: FindingMeta = {
  category: 'PROCESSING_ERROR',
  defaultOwner: 'CARROT',
  description: 'O documento do MassID não foi encontrado durante a validação.',
  guidance:
    'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
  title: 'Documento do MassID não encontrado',
};

export const MASS_ID_WITHOUT_EVENTS_META: FindingMeta = {
  category: 'MISSING_EVENT',
  defaultOwner: 'INTEGRATOR',
  description: 'O MassID não tem nenhum evento.',
  guidance: 'Envie o MassID com os eventos da cadeia de custódia.',
  title: 'MassID sem eventos',
};

export const MISSING_RECYCLER_ACCREDITATION_DOCUMENT_META: FindingMeta = {
  category: 'ACCREDITATION',
  defaultOwner: 'TO_CONFIRM',
  dependsOnAccreditation: MassIDActorType.RECYCLER,
  description:
    'O documento de credenciamento do reciclador não foi encontrado.',
  guidance:
    'Confirme que o reciclador da massa está credenciado e referenciado corretamente. A Carrot confirma a origem da pendência.',
  title: 'Credenciamento do reciclador não encontrado',
};

export const MISSING_PICK_UP_EVENT_META: FindingMeta = {
  category: 'MISSING_EVENT',
  defaultOwner: 'INTEGRATOR',
  description: 'O MassID não tem o evento "Pick-up".',
  guidance: 'Envie o evento "Pick-up" registrando a coleta da massa.',
  title: 'Evento de coleta ausente',
};

export const INVALID_LOCAL_WASTE_CLASSIFICATION_ID_META: FindingMeta = {
  category: 'INVALID_DATA',
  defaultOwner: 'INTEGRATOR',
  description:
    'O "Local Waste Classification ID" não corresponde a um código aceito pela metodologia.',
  guidance:
    'Envie o código de classificação local do resíduo aceito pela metodologia.',
  title: 'Código de classificação do resíduo não aceito',
};
