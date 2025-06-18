import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonZeroPositive,
} from '@carrot-fndn/shared/helpers';
import {
  getEmissionAndCompostingMetricsEvent,
  getEventAttributeValue,
} from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS_ID,
  PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentSubtype,
  MassIdOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { is } from 'typia';

import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import {
  calculatePreventedEmissions,
  getPreventedEmissionsFactor,
  getWasteGeneratorBaselineByWasteSubtype,
  throwIfMissing,
} from './prevented-emissions.helpers';
import { type RuleSubject } from './prevented-emissions.types';

const { BASELINES, EXCEEDING_EMISSION_COEFFICIENT } =
  DocumentEventAttributeName;

export const RESULT_COMMENTS = {
  MISSING_EXCEEDING_EMISSION_COEFFICIENT: `The "${EXCEEDING_EMISSION_COEFFICIENT}" attribute was not found in the "Recycler Homologation" document or it is invalid.`,
  MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE: (
    wasteSubtype: MassIdOrganicSubtype,
  ) =>
    `The "${BASELINES}" was not found in the "Waste Generator Homologation" document for the waste subtype "${wasteSubtype}" or it is invalid.`,
  PASSED: (
    preventedEmissions: number,
    preventedEmissionsByWasteSubtypeAndBaselinePerTon: number,
    exceedingEmissionCoefficient: number,
    currentValue: number,
  ) =>
    `The prevented emissions were calculated as ${preventedEmissions} kg CO₂e using the formula (1 - ${exceedingEmissionCoefficient}) x ${preventedEmissionsByWasteSubtypeAndBaselinePerTon} x ${currentValue} = ${preventedEmissions} [formula: (1 - exceeding_emission_coefficient) x prevented_emissions_by_waste_subtype_and_baseline_per_ton x current_value = prevented_emissions].`,
} as const;

interface Documents {
  massIdDocument: Document;
  recyclerHomologationDocument: Document;
  wasteGeneratorHomologationDocument: Document;
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
      massIdDocumentValue,
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

    const preventedEmissionsByWasteSubtypeAndBaselinePerTon =
      getPreventedEmissionsFactor(wasteSubtype, wasteGeneratorBaseline);

    const preventedEmissions = calculatePreventedEmissions(
      exceedingEmissionCoefficient,
      preventedEmissionsByWasteSubtypeAndBaselinePerTon,
      massIdDocumentValue,
    );

    return {
      resultComment: RESULT_COMMENTS.PASSED(
        preventedEmissions,
        preventedEmissionsByWasteSubtypeAndBaselinePerTon,
        exceedingEmissionCoefficient,
        massIdDocumentValue,
      ),
      resultContent: {
        preventedEmissions,
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
        relatedDocuments: [PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.match],
      },
      documentId: ruleInput.documentId,
    });
  }

  protected getRuleSubject({
    massIdDocument,
    recyclerHomologationDocument,
    wasteGeneratorHomologationDocument,
  }: Documents): RuleSubject {
    const emissionAndCompostingMetricsEvent =
      getEmissionAndCompostingMetricsEvent(recyclerHomologationDocument);

    if (!is<MassIdOrganicSubtype>(massIdDocument.subtype)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE.INVALID_MASS_ID_DOCUMENT_SUBTYPE,
      );
    }

    const wasteGeneratorBaseline = getWasteGeneratorBaselineByWasteSubtype(
      wasteGeneratorHomologationDocument,
      massIdDocument.subtype,
      this.processorErrors,
    );

    return {
      exceedingEmissionCoefficient: getEventAttributeValue(
        emissionAndCompostingMetricsEvent,
        EXCEEDING_EMISSION_COEFFICIENT,
      ),
      massIdDocumentValue: massIdDocument.currentValue,
      wasteGeneratorBaseline,
      wasteSubtype: massIdDocument.subtype,
    };
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<Documents> {
    let recyclerHomologationDocument: Document | undefined;
    let massIdDocument: Document | undefined;
    let wasteGeneratorHomologationDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (
        PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.matches(documentReference) &&
        documentReference.subtype === DocumentSubtype.RECYCLER
      ) {
        recyclerHomologationDocument = document;
      }

      if (
        PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.matches(documentReference) &&
        documentReference.subtype === DocumentSubtype.WASTE_GENERATOR
      ) {
        wasteGeneratorHomologationDocument = document;
      }

      if (MASS_ID.matches(documentReference)) {
        massIdDocument = document;
      }
    });

    throwIfMissing(
      recyclerHomologationDocument,
      this.processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_HOMOLOGATION_DOCUMENT,
      this.processorErrors,
    );

    throwIfMissing(
      massIdDocument,
      this.processorErrors.ERROR_MESSAGE.MISSING_MASS_ID_DOCUMENT,
      this.processorErrors,
    );

    throwIfMissing(
      wasteGeneratorHomologationDocument,
      this.processorErrors.ERROR_MESSAGE
        .MISSING_WASTE_GENERATOR_HOMOLOGATION_DOCUMENT,
      this.processorErrors,
    );

    return {
      massIdDocument: massIdDocument as Document,
      recyclerHomologationDocument: recyclerHomologationDocument as Document,
      wasteGeneratorHomologationDocument:
        wasteGeneratorHomologationDocument as Document,
    };
  }
}
