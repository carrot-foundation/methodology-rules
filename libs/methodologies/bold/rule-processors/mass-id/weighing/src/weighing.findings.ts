import { defineRuleFindings } from '@carrot-fndn/shared/rule/result';

import {
  INVALID_RESULT_COMMENTS,
  NOT_FOUND_RESULT_COMMENTS,
  WRONG_FORMAT_RESULT_COMMENTS,
} from './weighing.constants';
import { WeighingProcessorErrors } from './weighing.errors';
import { ruleDefinition } from './weighing.rule-definition';

export const WEIGHING_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    ERROR: new WeighingProcessorErrors().ERROR_MESSAGE,
    INVALID: INVALID_RESULT_COMMENTS,
    NOT_FOUND: NOT_FOUND_RESULT_COMMENTS,
    WRONG_FORMAT: WRONG_FORMAT_RESULT_COMMENTS,
  },
  {
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação da pesagem foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar a pesagem',
    },
    'ERROR.INVALID_RULE_SUBJECT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'Os dados da MassID não atendem à estrutura exigida para validar a pesagem.',
      guidance: 'Confira os eventos "Weighing" e seus atributos na MassID.',
      title: 'Dados de pesagem insuficientes',
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
    'ERROR.MISSING_RECYCLER_ACCREDITATION_DOCUMENT': {
      category: 'ACCREDITATION',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O documento de credenciamento do reciclador não foi encontrado.',
      guidance:
        'Confirme que o reciclador da massa está credenciado e referenciado corretamente. A Carrot confirma a origem da pendência.',
      title: 'Credenciamento do reciclador não encontrado',
    },
    'INVALID.CONTAINER_CAPACITY_FORMAT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O formato do "Container Capacity" não é um dos formatos aceitos.',
      guidance: 'Envie a capacidade do contêiner em um dos formatos aceitos.',
      title: 'Formato da capacidade do contêiner inválido',
    },
    'INVALID.CONTAINER_QUANTITY': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Container Quantity" foi informado com o tipo de contêiner "Truck", que não o admite.',
      guidance: 'Remova o "Container Quantity" quando o contêiner for "Truck".',
      title: 'Quantidade de contêineres indevida',
    },
    'INVALID.GROSS_WEIGHT_FORMAT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O formato do "Gross Weight" não é um dos formatos aceitos.',
      guidance: 'Envie o peso bruto em um dos formatos aceitos.',
      title: 'Formato do peso bruto inválido',
    },
    'INVALID.NET_WEIGHT_CALCULATION': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O peso líquido calculado (peso bruto menos tara vezes a quantidade de contêineres) difere do valor do evento em mais de 0,1 kg.',
      guidance:
        'Confira peso bruto, tara, quantidade de contêineres e valor do evento "Weighing".',
      title: 'Peso líquido não confere com a pesagem',
    },
    'INVALID.SCALE_TICKET_EXTRACTION_FAILED': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'CARROT',
      description:
        'O ticket de balança anexado não pôde ser processado para verificação.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Ticket de balança não processado',
    },
    'INVALID.SCALE_TICKET_LAYOUT_NOT_RECOGNIZED': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'INTEGRATOR',
      description:
        'Nenhum peso líquido pôde ser lido do ticket de balança anexado, porque o layout não é suportado.',
      guidance:
        'Anexe o ticket de balança original emitido pela balança credenciada, legível e completo.',
      title: 'Ticket de balança em layout não reconhecido',
    },
    'INVALID.SCALE_TICKET_MISSING_SOURCE': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'A verificação do ticket de balança é exigida, mas nenhum arquivo de ticket foi encontrado.',
      guidance: 'Anexe o ticket de balança ao evento "Weighing".',
      title: 'Ticket de balança não localizado',
    },
    'INVALID.SCALE_TICKET_NET_WEIGHT_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'INTEGRATOR',
      description:
        'O peso líquido lido no ticket de balança não é igual ao valor do evento "Weighing".',
      guidance:
        'Confira o ticket anexado e o valor do evento "Weighing"; envie o peso que consta no ticket.',
      title: 'Peso do ticket diverge do evento',
    },
    'INVALID.SCALE_TICKET_UNSUPPORTED_LAYOUT': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'CARROT',
      description:
        'O layout de ticket de balança exigido pelo credenciamento não é suportado pela validação.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Layout de ticket não suportado',
    },
    'INVALID.SCALE_TYPE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O "Scale Type" informado não é aceito pela metodologia.',
      guidance: 'Envie um dos tipos de balança aceitos pela metodologia.',
      title: 'Tipo de balança não aceito',
    },
    'INVALID.SCALE_TYPE_MISMATCH': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Scale Type" informado não é o mesmo tipo de balança do credenciamento.',
      guidance:
        'Envie o tipo de balança que consta no credenciamento do reciclador.',
      title: 'Tipo de balança diverge do credenciado',
    },
    'INVALID.TARE_FORMAT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O formato do "Tare" não é um dos formatos aceitos.',
      guidance: 'Envie a tara em um dos formatos aceitos.',
      title: 'Formato da tara inválido',
    },
    'INVALID.TWO_STEP_CONTAINER_TYPE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'Na pesagem em duas etapas, o "Container Type" deve ser "Truck".',
      guidance:
        'Envie o tipo de contêiner "Truck" nas pesagens em duas etapas.',
      title: 'Contêiner inválido para pesagem em duas etapas',
    },
    'INVALID.TWO_STEP_WEIGHING_EVENT_PARTICIPANT_IDS': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O participante da primeira pesagem não é o mesmo da segunda.',
      guidance: 'Envie as duas pesagens com o mesmo participante.',
      title: 'Participantes das pesagens divergem',
    },
    'INVALID.TWO_STEP_WEIGHING_EVENT_SCALE_TYPE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'Na pesagem em duas etapas, o "Scale Type" deve ser "Weighbridge".',
      guidance:
        'Envie o tipo de balança "Weighbridge" nas pesagens em duas etapas.',
      title: 'Balança inválida para pesagem em duas etapas',
    },
    'INVALID.TWO_STEP_WEIGHING_EVENT_VALUES': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'Um atributo da primeira pesagem tem valor diferente do mesmo atributo na segunda.',
      guidance:
        'Envie os atributos comuns às duas pesagens com os mesmos valores.',
      title: 'Valores das pesagens divergem',
    },
    'INVALID.VEHICLE_LICENSE_PLATE_FORMAT': {
      category: 'INVALID_DATA',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O "Vehicle License Plate" da pesagem não está em um formato válido.',
      guidance:
        'Confira a placa registrada na pesagem. A Carrot confirma a origem da pendência.',
      title: 'Placa do veículo em formato inválido',
    },
    'INVALID.WEIGHING_CAPTURE_METHOD': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Weighing Capture Method" informado não é aceito pela metodologia.',
      guidance:
        'Envie um dos métodos de captura de pesagem aceitos pela metodologia.',
      title: 'Método de captura da pesagem não aceito',
    },
    'NOT_FOUND.ACCREDITATION_EVENT': {
      category: 'ACCREDITATION',
      defaultOwner: 'RECYCLER',
      description:
        'O credenciamento do reciclador não tem o evento de validação da balança.',
      guidance:
        'Oriente o reciclador a registrar a validação da balança no credenciamento.',
      title: 'Validação da balança ausente no credenciamento',
    },
    'NOT_FOUND.MORE_THAN_TWO_WEIGHING_EVENTS': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'A MassID tem mais de dois eventos "Weighing", o que não é suportado.',
      guidance: 'Envie uma pesagem, ou duas no caso de pesagem em duas etapas.',
      title: 'Mais de duas pesagens',
    },
    'NOT_FOUND.NO_WEIGHING_EVENTS': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description: 'A MassID não tem eventos "Weighing".',
      guidance: 'Envie o evento "Weighing" da massa.',
      title: 'Evento de pesagem ausente',
    },
    'WRONG_FORMAT.CONTAINER_CAPACITY': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O "Container Capacity" não é maior que zero.',
      guidance: 'Informe a capacidade do contêiner, maior que zero.',
      title: 'Capacidade do contêiner inválida',
    },
    'WRONG_FORMAT.CONTAINER_QUANTITY': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Container Quantity" não é um número inteiro maior que zero e o contêiner não é "Truck".',
      guidance:
        'Informe a quantidade de contêineres como número inteiro maior que zero.',
      title: 'Quantidade de contêineres inválida',
    },
    'WRONG_FORMAT.CONTAINER_TYPE': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O evento "Weighing" não informa o "Container Type".',
      guidance: 'Inclua o "Container Type" no evento "Weighing".',
      title: 'Tipo de contêiner ausente',
    },
    'WRONG_FORMAT.DESCRIPTION': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O evento "Weighing" não tem "Description".',
      guidance: 'Inclua a "Description" no evento "Weighing".',
      title: 'Descrição da pesagem ausente',
    },
    'WRONG_FORMAT.EVENT_VALUE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O valor do evento "Weighing" está ausente ou não é maior que zero.',
      guidance: 'Informe o peso líquido da pesagem em kg, maior que zero.',
      title: 'Valor da pesagem inválido',
    },
    'WRONG_FORMAT.GROSS_WEIGHT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Gross Weight" da pesagem está ausente ou não é maior que zero.',
      guidance: 'Informe o peso bruto da pesagem, maior que zero.',
      title: 'Peso bruto inválido',
    },
    'WRONG_FORMAT.TARE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O "Tare" da pesagem está ausente ou não é maior que zero.',
      guidance: 'Informe a tara da pesagem, maior que zero.',
      title: 'Tara inválida',
    },
  },
);
