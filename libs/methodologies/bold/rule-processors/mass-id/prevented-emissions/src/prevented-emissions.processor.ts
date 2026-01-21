import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonEmptyString,
  isNonZeroPositive,
} from '@carrot-fndn/shared/helpers';
import {
  getEventAttributeValue,
  getLastYearEmissionAndCompostingMetricsEvent,
} from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS_ID,
  PARTICIPANT_ACCREDITATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentSubtype,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { getYear } from 'date-fns';
import { is } from 'typia';

import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import {
  calculatePreventedEmissions,
  formatNumber,
  getGasTypeFromEvent,
  getPreventedEmissionsFactor,
  getWasteGeneratorBaselineByWasteSubtype,
  throwIfMissing,
} from './prevented-emissions.helpers';
import {
  buildOthersIfOrganicContext,
  getOthersIfOrganicAuditDetails,
  getOthersIfOrganicContextFromMassIdDocument,
  OthersIfOrganicAuditDetails,
} from './prevented-emissions.others-organic.helpers';
import { type RuleSubject } from './prevented-emissions.types';

const { BASELINES, EXCEEDING_EMISSION_COEFFICIENT } =
  DocumentEventAttributeName;

export const RESULT_COMMENTS = {
  MISSING_EXCEEDING_EMISSION_COEFFICIENT: `The "${EXCEEDING_EMISSION_COEFFICIENT}" attribute was not found in the "Recycler Accreditation" document or it is invalid.`,
  MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE: (
    wasteSubtype: MassIDOrganicSubtype,
  ) =>
    `The "${BASELINES}" was not found in the "Waste Generator Accreditation" document for the waste subtype "${wasteSubtype}" or it is invalid.`,
  PASSED: (
    preventedEmissions: number,
    preventedEmissionsByWasteSubtypeAndBaselinePerTon: number,
    exceedingEmissionCoefficient: number,
    currentValue: number,
  ) =>
    `The prevented emissions were calculated as ${formatNumber(preventedEmissions)} kg CO₂e using the formula (${currentValue} x ${preventedEmissionsByWasteSubtypeAndBaselinePerTon}) - (${currentValue} x ${exceedingEmissionCoefficient}) = ${formatNumber(preventedEmissions)} [formula: (current_value x prevented_emissions_by_waste_subtype_and_baseline_per_ton) - (current_value x exceeding_emission_coefficient) = prevented_emissions].`,
} as const;

interface Documents {
  massIDDocument: Document;
  recyclerAccreditationDocument: Document;
  wasteGeneratorVerificationDocument: Document;
}

export class PreventedEmissionsProcessor extends RuleDataProcessor {
  protected readonly processorErrors = new PreventedEmissionsProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentsQuery = await this.generateDocumentQuery(ruleInput);
      const documents = await this.collectDocuments(documentsQuery);
      const ruleSubject = this.getRuleSubject(documents);

      const { resultComment, resultContent, resultStatus } =
        this.evaluateResult(ruleSubject);

      return mapToRuleOutput(ruleInput, resultStatus, {
        resultComment: getOrUndefined(resultComment),
        resultContent: {
          ...resultContent,
          ruleSubject,
        },
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.FAILED, {
        resultComment: this.processorErrors.getResultCommentFromError(error),
      });
    }
  }

  protected evaluateResult(ruleSubject: RuleSubject): EvaluateResultOutput {
    const {
      exceedingEmissionCoefficient,
      massIDDocumentValue,
      wasteGeneratorBaseline,
      wasteSubtype,
    } = ruleSubject;

    if (!isNonZeroPositive(exceedingEmissionCoefficient)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    if (isNil(wasteGeneratorBaseline)) {
      return {
        resultComment:
          RESULT_COMMENTS.MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE(
            wasteSubtype,
          ),
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    const othersIfOrganicContext = buildOthersIfOrganicContext(ruleSubject);

    const preventedEmissionsByWasteSubtypeAndBaselinePerTon =
      getPreventedEmissionsFactor(
        wasteSubtype,
        wasteGeneratorBaseline,
        this.processorErrors,
        othersIfOrganicContext,
      );

    const preventedEmissions = calculatePreventedEmissions(
      exceedingEmissionCoefficient,
      preventedEmissionsByWasteSubtypeAndBaselinePerTon,
      massIDDocumentValue,
    );

    let othersIfOrganicAudit: OthersIfOrganicAuditDetails | undefined;

    if (
      wasteSubtype === MassIDOrganicSubtype.OTHERS_IF_ORGANIC &&
      isNonEmptyString(ruleSubject.normalizedLocalWasteClassificationId)
    ) {
      othersIfOrganicAudit = getOthersIfOrganicAuditDetails(
        ruleSubject.normalizedLocalWasteClassificationId,
        wasteGeneratorBaseline,
      );
    }

    return {
      resultComment: RESULT_COMMENTS.PASSED(
        preventedEmissions,
        preventedEmissionsByWasteSubtypeAndBaselinePerTon,
        exceedingEmissionCoefficient,
        massIDDocumentValue,
      ),
      resultContent: {
        gasType: ruleSubject.gasType,
        ...(othersIfOrganicAudit && { othersIfOrganicAudit }),
        preventedCo2e: preventedEmissions,
      },
      resultStatus: RuleOutputStatus.PASSED,
    };
  }

  protected async generateDocumentQuery(ruleInput: RuleInput) {
    const documentQueryService = new DocumentQueryService(
      provideDocumentLoaderService,
    );

    return documentQueryService.load({
      context: {
        s3KeyPrefix: ruleInput.documentKeyPrefix,
      },
      criteria: {
        parentDocument: {},
        relatedDocuments: [PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.match],
      },
      documentId: ruleInput.documentId,
    });
  }

  protected getRuleSubject({
    massIDDocument,
    recyclerAccreditationDocument,
    wasteGeneratorVerificationDocument,
  }: Documents): RuleSubject {
    const lastEmissionAndCompostingMetricsEvent =
      getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent:
          recyclerAccreditationDocument,
        documentYear: getYear(massIDDocument.externalCreatedAt),
      });

    const gasType = getGasTypeFromEvent(lastEmissionAndCompostingMetricsEvent);

    if (!is<MassIDOrganicSubtype>(massIDDocument.subtype)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE.INVALID_MASS_ID_DOCUMENT_SUBTYPE,
      );
    }

    const wasteGeneratorBaseline = getWasteGeneratorBaselineByWasteSubtype(
      wasteGeneratorVerificationDocument,
      massIDDocument.subtype,
      this.processorErrors,
    );

    const { localWasteClassificationId, normalizedLocalWasteClassificationId } =
      getOthersIfOrganicContextFromMassIdDocument(massIDDocument);

    return {
      exceedingEmissionCoefficient: getEventAttributeValue(
        lastEmissionAndCompostingMetricsEvent,
        EXCEEDING_EMISSION_COEFFICIENT,
      ),
      gasType,
      massIDDocumentValue: massIDDocument.currentValue,
      ...(!isNil(localWasteClassificationId) && {
        localWasteClassificationId,
      }),
      ...(!isNil(normalizedLocalWasteClassificationId) && {
        normalizedLocalWasteClassificationId,
      }),
      wasteGeneratorBaseline,
      wasteSubtype: massIDDocument.subtype,
    };
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<Documents> {
    let recyclerAccreditationDocument: Document | undefined;
    let massIDDocument: Document | undefined;
    let wasteGeneratorVerificationDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (
        PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation) &&
        documentRelation.subtype === DocumentSubtype.RECYCLER.toString()
      ) {
        recyclerAccreditationDocument = document;
      }

      if (
        PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation) &&
        documentRelation.subtype === DocumentSubtype.WASTE_GENERATOR.toString()
      ) {
        wasteGeneratorVerificationDocument = document;
      }

      if (MASS_ID.matches(documentRelation)) {
        massIDDocument = document;
      }
    });

    throwIfMissing(
      recyclerAccreditationDocument,
      this.processorErrors.ERROR_MESSAGE
        .MISSING_RECYCLER_ACCREDITATION_DOCUMENT,
      this.processorErrors,
    );

    throwIfMissing(
      massIDDocument,
      this.processorErrors.ERROR_MESSAGE.MISSING_MASS_ID_DOCUMENT,
      this.processorErrors,
    );

    throwIfMissing(
      wasteGeneratorVerificationDocument,
      this.processorErrors.ERROR_MESSAGE
        .MISSING_WASTE_GENERATOR_VERIFICATION_DOCUMENT,
      this.processorErrors,
    );

    return {
      massIDDocument: massIDDocument as Document,
      recyclerAccreditationDocument: recyclerAccreditationDocument as Document,
      wasteGeneratorVerificationDocument:
        wasteGeneratorVerificationDocument as Document,
    };
  }
}
