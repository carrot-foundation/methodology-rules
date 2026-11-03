import type { RuleFinding } from '@carrot-fndn/shared/rule/types';

import {
  DOCUMENT_EXTRACTION_COMMENTS,
  LOW_CONFIDENCE_REASON_CODE_PREFIX,
  type ReviewReason,
} from '@carrot-fndn/shared/document-extractor';
import { BoldReportType } from '@carrot-fndn/shared/methodologies/bold/types';
import {
  defineRuleFindings,
  type FindingEvidenceSelector,
} from '@carrot-fndn/shared/rule/result';

import type {
  CdfCrossValidation,
  MtrCrossValidation,
} from './document-manifest-data.result-content.types';

import {
  CROSS_VALIDATION_COMMENTS,
  RESULT_COMMENTS,
} from './document-manifest-data.constants';
import { DocumentManifestDataProcessorErrors } from './document-manifest-data.errors';
import { ruleDefinition } from './document-manifest-data.rule-definition';

const crossValidationEvidence = (
  field: keyof CdfCrossValidation | keyof MtrCrossValidation,
): FindingEvidenceSelector => ({ field, source: 'CROSS_VALIDATION' });

export const DOCUMENT_MANIFEST_DATA_FINDINGS = defineRuleFindings(
  ruleDefinition.slug,
  {
    CROSS_VALIDATION: CROSS_VALIDATION_COMMENTS,
    DOCUMENT_EXTRACTION: DOCUMENT_EXTRACTION_COMMENTS,
    ERROR: new DocumentManifestDataProcessorErrors().ERROR_MESSAGE,
    RESULT: RESULT_COMMENTS,
  },
  {
    'CROSS_VALIDATION.DOCUMENT_EXTRACTION_CONFIDENCE_LOW': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'CARROT',
      description:
        'A leitura automática do documento anexado teve baixa confiança; a comparação com os eventos não foi feita e exige revisão manual.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot revisa o documento manualmente.',
      title: 'Leitura do documento com baixa confiança',
    },
    'CROSS_VALIDATION.DOCUMENT_NUMBER_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Document Number" declarado no evento não é igual ao número lido no documento anexado.',
      evidence: [crossValidationEvidence('documentNumber')],
      guidance:
        'Envie o número exatamente como consta no documento anexado, ou anexe o documento correto.',
      title: 'Número do documento diverge do anexo',
    },
    'CROSS_VALIDATION.DROP_OFF_DATE_OUTSIDE_PERIOD': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'A data do evento "Drop-off" está fora do período de processamento informado no CDF.',
      documentKinds: [BoldReportType.CDF],
      evidence: [crossValidationEvidence('processingPeriod')],
      guidance:
        'Confira a data do evento "Drop-off" e o CDF anexado. A Carrot confirma a origem da divergência.',
      title: 'Recebimento fora do período do CDF',
    },
    'CROSS_VALIDATION.FIELD_NOT_EXTRACTED': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'RECYCLER',
      description:
        'Um campo necessário para a comparação não pôde ser lido no documento anexado.',
      guidance:
        'Oriente o reciclador a anexar o documento original completo e legível.',
      title: 'Campo não lido no documento',
    },
    'CROSS_VALIDATION.GENERATOR_ADDRESS_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O endereço do gerador lido no documento anexado não confere com o endereço do evento de ator "Waste Generator".',
      evidence: [crossValidationEvidence('generator')],
      guidance:
        'Confira o endereço do gerador enviado e o documento anexado. A Carrot confirma a origem da divergência.',
      title: 'Endereço do gerador diverge do anexo',
    },
    'CROSS_VALIDATION.GENERATOR_TAX_ID_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O documento fiscal do gerador lido no documento anexado não é o mesmo do participante "Waste Generator".',
      evidence: [crossValidationEvidence('generator')],
      guidance:
        'Confira o gerador enviado e o documento anexado. A Carrot confirma a origem da divergência.',
      title: 'Documento fiscal do gerador diverge do anexo',
    },
    'CROSS_VALIDATION.HAULER_TAX_ID_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O documento fiscal do transportador lido no MTR não é o mesmo do participante "Hauler".',
      documentKinds: [BoldReportType.MTR],
      evidence: [crossValidationEvidence('hauler')],
      guidance:
        'Confira o transportador enviado e o MTR anexado. A Carrot confirma a origem da divergência.',
      title: 'Documento fiscal do transportador diverge do MTR',
    },
    'CROSS_VALIDATION.ISSUE_DATE_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'INTEGRATOR',
      description:
        'O "Issue Date" declarado no evento não é igual à data lida no documento anexado.',
      evidence: [crossValidationEvidence('issueDate')],
      guidance:
        'Envie a data de emissão exatamente como consta no documento anexado.',
      title: 'Data de emissão diverge do anexo',
    },
    'CROSS_VALIDATION.MTR_NUMBER_NOT_IN_CDF': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O número do MTR desta massa não está na lista de MTRs do CDF anexado.',
      documentKinds: [BoldReportType.CDF],
      evidence: [crossValidationEvidence('mtrNumbers')],
      guidance:
        'Confira se o CDF anexado cobre o MTR desta massa. A Carrot confirma a origem da divergência.',
      title: 'MTR não consta no CDF',
    },
    'CROSS_VALIDATION.RECEIVER_ADDRESS_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O endereço do destinador lido no MTR não confere com o endereço do evento de ator "Recycler".',
      documentKinds: [BoldReportType.MTR],
      evidence: [crossValidationEvidence('receiver')],
      guidance:
        'Confira o endereço do reciclador enviado e o MTR anexado. A Carrot confirma a origem da divergência.',
      title: 'Endereço do destinador diverge do MTR',
    },
    'CROSS_VALIDATION.RECEIVER_TAX_ID_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O documento fiscal do destinador lido no MTR não é o mesmo do participante "Recycler".',
      documentKinds: [BoldReportType.MTR],
      evidence: [crossValidationEvidence('receiver')],
      guidance:
        'Confira o reciclador enviado e o MTR anexado. A Carrot confirma a origem da divergência.',
      title: 'Documento fiscal do destinador diverge do MTR',
    },
    'CROSS_VALIDATION.RECEIVING_DATE_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'A data de recebimento lida no MTR difere da data do evento "Drop-off".',
      documentKinds: [BoldReportType.MTR],
      evidence: [crossValidationEvidence('receivingDate')],
      guidance:
        'Confira a data do evento "Drop-off" e o MTR anexado. A Carrot confirma a origem da divergência.',
      title: 'Data de recebimento diverge do MTR',
    },
    'CROSS_VALIDATION.RECYCLER_TAX_ID_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'O documento fiscal do reciclador lido no CDF não é o mesmo do participante "Recycler".',
      documentKinds: [BoldReportType.CDF],
      evidence: [crossValidationEvidence('recycler')],
      guidance:
        'Confira o reciclador enviado e o CDF anexado. A Carrot confirma a origem da divergência.',
      title: 'Documento fiscal do reciclador diverge do CDF',
    },
    'CROSS_VALIDATION.RECYCLING_MANIFEST_WASTE_QUANTITY_WEIGHT_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'A quantidade de resíduo lida no CDF é menor que o peso do evento "Weighing".',
      documentKinds: [BoldReportType.CDF],
      evidence: [crossValidationEvidence('wasteQuantityWeight')],
      guidance:
        'Confira a pesagem e o CDF anexado. A Carrot confirma a origem da divergência.',
      title: 'Quantidade do CDF menor que a pesagem',
    },
    'CROSS_VALIDATION.RECYCLING_MANIFEST_WASTE_TYPE_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'Nenhum tipo de resíduo lido no CDF corresponde à classificação de resíduo do evento.',
      documentKinds: [BoldReportType.CDF],
      evidence: [crossValidationEvidence('wasteType')],
      guidance:
        'Confira a classificação do resíduo enviada e o CDF anexado. A Carrot confirma a origem da divergência.',
      title: 'Resíduo do CDF diverge da classificação',
    },
    'CROSS_VALIDATION.TRANSPORT_DATE_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'A data de transporte lida no MTR difere da data do evento "Pick-up".',
      documentKinds: [BoldReportType.MTR],
      evidence: [crossValidationEvidence('transportDate')],
      guidance:
        'Confira a data do evento "Pick-up" e o MTR anexado. A Carrot confirma a origem da divergência.',
      title: 'Data de transporte diverge do MTR',
    },
    'CROSS_VALIDATION.VEHICLE_PLATE_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'INTEGRATOR',
      description:
        'A placa do veículo lida no MTR não é a mesma do evento "Pick-up".',
      documentKinds: [BoldReportType.MTR],
      evidence: [crossValidationEvidence('vehiclePlate')],
      guidance:
        'Envie a placa do veículo exatamente como consta no MTR anexado.',
      title: 'Placa do veículo diverge do MTR',
    },
    'CROSS_VALIDATION.WASTE_QUANTITY_WEIGHT_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'A quantidade de resíduo lida no MTR é menor que o peso do evento "Weighing".',
      documentKinds: [BoldReportType.MTR],
      evidence: [crossValidationEvidence('wasteQuantityWeight')],
      guidance:
        'Confira a pesagem e o MTR anexado. A Carrot confirma a origem da divergência.',
      title: 'Quantidade do MTR menor que a pesagem',
    },
    'CROSS_VALIDATION.WASTE_TYPE_MISMATCH': {
      category: 'DOCUMENT_DIVERGENCE',
      defaultOwner: 'TO_CONFIRM',
      description:
        'Nenhum tipo de resíduo lido no MTR corresponde à classificação de resíduo do evento "Pick-up".',
      documentKinds: [BoldReportType.MTR],
      evidence: [crossValidationEvidence('wasteType')],
      guidance:
        'Confira a classificação do resíduo enviada e o MTR anexado. A Carrot confirma a origem da divergência.',
      title: 'Resíduo do MTR diverge da classificação',
    },
    'DOCUMENT_EXTRACTION.EXTRACTION_FAILED': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'CARROT',
      description: 'A leitura automática do documento anexado falhou.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha na leitura do documento',
    },
    'DOCUMENT_EXTRACTION.LAYOUT_NOT_RECOGNIZED': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'INTEGRATOR',
      description:
        'O documento anexado não corresponde a nenhum layout suportado.',
      guidance:
        'Anexe o documento oficial original, emitido pelo sistema do órgão ambiental, completo e legível.',
      title: 'Layout do documento não reconhecido',
    },
    'DOCUMENT_EXTRACTION.LOW_CONFIDENCE_FIELD': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'RECYCLER',
      description:
        'Um campo do documento anexado foi lido com baixa confiança.',
      guidance:
        'Oriente o reciclador a anexar o documento original completo e legível.',
      title: 'Campo lido com baixa confiança',
    },
    'DOCUMENT_EXTRACTION.LOW_LAYOUT_MATCH_SCORE': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'CARROT',
      description:
        'O documento anexado corresponde ao layout esperado com pontuação abaixo do limite de revisão.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot revisa o documento manualmente.',
      title: 'Layout do documento com baixa correspondência',
    },
    'DOCUMENT_EXTRACTION.UNKNOWN_DOCUMENT_TYPE': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'CARROT',
      description:
        'O tipo do documento anexado não foi identificado, e a comparação com os eventos não foi feita.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Tipo do documento não identificado',
    },
    'ERROR.FAILED_BY_ERROR': {
      category: 'PROCESSING_ERROR',
      defaultOwner: 'CARROT',
      description:
        'A validação do manifesto foi interrompida por um erro inesperado.',
      guidance:
        'Nenhuma ação do integrador é necessária: a Carrot investiga a falha e reexecuta a auditoria.',
      title: 'Falha ao validar o manifesto',
    },
    'RESULT.ADDRESS_MISMATCH': {
      category: 'LOCATION',
      defaultOwner: 'INTEGRATOR',
      description:
        'O endereço do evento "Recycling Manifest" não é o mesmo do evento de ator "Recycler".',
      documentKinds: [BoldReportType.CDF],
      guidance:
        'Envie o evento "Recycling Manifest" com o endereço do reciclador.',
      title: 'Endereço do CDF diverge do reciclador',
    },
    'RESULT.ATTACHMENT_AND_JUSTIFICATION_PROVIDED': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento do manifesto traz o documento anexado e também uma "Exemption Justification"; apenas um deles é permitido.',
      guidance:
        'Remova a "Exemption Justification" quando o documento estiver anexado.',
      title: 'Anexo e justificativa de dispensa informados juntos',
    },
    'RESULT.INCORRECT_ATTACHMENT_LABEL': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento do manifesto tem anexo, mas nenhum com o rótulo do tipo de manifesto esperado.',
      guidance:
        'Anexe o documento com o rótulo do tipo de manifesto correspondente ao evento.',
      title: 'Anexo com rótulo incorreto',
    },
    'RESULT.INVALID_BR_DOCUMENT_TYPE': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'Para recicladores no Brasil, o "Document Type" do evento deve ser o do manifesto avaliado (MTR no transporte, CDF na reciclagem).',
      guidance:
        'Envie o "Document Type" correspondente ao manifesto do evento.',
      title: 'Tipo de documento inválido para o Brasil',
    },
    'RESULT.INVALID_ISSUE_DATE_FORMAT': {
      category: 'INVALID_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O "Issue Date" não foi declarado com o formato DATE.',
      guidance: 'Envie a data de emissão com o formato DATE.',
      title: 'Formato da data de emissão inválido',
    },
    'RESULT.MISSING_ATTRIBUTES': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description:
        'O evento do manifesto não tem o documento anexado nem uma "Exemption Justification".',
      guidance:
        'Anexe o documento do manifesto ou informe a justificativa de dispensa.',
      title: 'Documento e justificativa ausentes',
    },
    'RESULT.MISSING_DOCUMENT_NUMBER': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O evento do manifesto não informa o "Document Number".',
      guidance: 'Inclua o número do documento no evento do manifesto.',
      title: 'Número do documento ausente',
    },
    'RESULT.MISSING_DOCUMENT_TYPE': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O evento do manifesto não informa o "Document Type".',
      guidance: 'Inclua o tipo de documento no evento do manifesto.',
      title: 'Tipo de documento ausente',
    },
    'RESULT.MISSING_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'A MassID não tem o evento do manifesto avaliado pela regra.',
      guidance:
        'Envie o evento do manifesto ("Transport Manifest" para o MTR, "Recycling Manifest" para o CDF).',
      title: 'Evento do manifesto ausente',
    },
    'RESULT.MISSING_ISSUE_DATE': {
      category: 'MISSING_DATA',
      defaultOwner: 'INTEGRATOR',
      description: 'O evento do manifesto não informa o "Issue Date".',
      guidance: 'Inclua a data de emissão no evento do manifesto.',
      title: 'Data de emissão ausente',
    },
    'RESULT.MISSING_RECYCLER_EVENT': {
      category: 'MISSING_EVENT',
      defaultOwner: 'INTEGRATOR',
      description:
        'A MassID não tem evento de ator "Recycler", necessário para validar o manifesto.',
      guidance: 'Envie o evento de ator "Recycler".',
      title: 'Reciclador não identificado',
    },
    'RESULT.PROVIDE_EXEMPTION_JUSTIFICATION': {
      category: 'MISSING_DATA',
      defaultOwner: 'CARROT',
      description:
        'O documento do manifesto não foi anexado e uma "Exemption Justification" foi declarada.',
      guidance:
        'Nenhuma ação do integrador é necessária quando a justificativa de dispensa é válida.',
      title: 'Documento dispensado por justificativa',
    },
    'RESULT.VALID_ATTACHMENT_DECLARATION': {
      category: 'DOCUMENT_READING',
      defaultOwner: 'CARROT',
      description:
        'O documento do manifesto foi anexado com número, data de emissão e quantidade.',
      guidance: 'Nenhuma ação do integrador é necessária.',
      title: 'Documento do manifesto declarado',
    },
  },
);

const isKeyOf = <T extends object>(
  object: T,
  key: string,
): key is Extract<keyof T, string> => Object.hasOwn(object, key);

export const toCrossValidationFinding = ({
  code,
}: ReviewReason): RuleFinding => {
  if (isKeyOf(CROSS_VALIDATION_COMMENTS, code)) {
    return DOCUMENT_MANIFEST_DATA_FINDINGS.finding(`CROSS_VALIDATION.${code}`);
  }

  if (code.startsWith(LOW_CONFIDENCE_REASON_CODE_PREFIX)) {
    return DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
      'DOCUMENT_EXTRACTION.LOW_CONFIDENCE_FIELD',
    );
  }

  if (isKeyOf(DOCUMENT_EXTRACTION_COMMENTS, code)) {
    return DOCUMENT_MANIFEST_DATA_FINDINGS.finding(
      `DOCUMENT_EXTRACTION.${code}`,
    );
  }

  throw new Error(`Unknown cross-validation reason code "${code}"`);
};
