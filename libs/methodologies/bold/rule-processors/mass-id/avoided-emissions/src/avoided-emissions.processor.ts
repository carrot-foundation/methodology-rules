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
  DocumentEventName,
  DocumentSubtype,
  MassIdOrganicSubtype,
  MethodologyBaseline,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { is } from 'typia';

import { AVOIDED_EMISSIONS_BY_MATERIAL_AND_BASELINE_PER_TON } from './avoided-emissions.constants';
import { AvoidedEmissionsProcessorErrors } from './avoided-emissions.errors';
import {
  type RuleSubject,
  WasteGeneratorBaselineValues,
} from './avoided-emissions.types';

const { BASELINES, EXCEEDING_EMISSION_COEFFICIENT } =
  DocumentEventAttributeName;
const { RECYCLING_BASELINES } = DocumentEventName;

export const RESULT_COMMENTS = {
  APPROVED: (
    avoidedEmissions: number,
    exceedingEmissionCoefficient: number,
    currentValue: number,
  ) =>
    `The avoided emissions were calculated as ${avoidedEmissions} kg CO₂e using the formula (1 - ${exceedingEmissionCoefficient}) × ${currentValue} = ${avoidedEmissions} [formula: (1 - emission_index) × current_value = avoided_emissions].`,
  MISSING_EXCEEDING_EMISSION_COEFFICIENT: `The "${EXCEEDING_EMISSION_COEFFICIENT}" attribute was not found in the "Recycler Homologation" document or it is invalid.`,
  MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE: (
    wasteSubtype: MassIdOrganicSubtype,
  ) =>
    `The "${BASELINES}" was not found in the "Waste Generator Homologation" document for the waste subtype "${wasteSubtype}" or it is invalid.`,
} as const;

interface Documents {
  massIdDocument: Document;
  recyclerHomologationDocument: Document;
  wasteGeneratorHomologationDocument: Document;
}

export class AvoidedEmissionsProcessor extends RuleDataProcessor {
  protected readonly processorErrors = new AvoidedEmissionsProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentsQuery = await this.generateDocumentQuery(ruleInput);
      const documents = await this.collectDocuments(documentsQuery);
      const ruleSubject = this.getRuleSubject(documents);

      const { resultComment, resultContent, resultStatus } =
        this.evaluateResult(ruleSubject);

      return mapToRuleOutput(ruleInput, resultStatus, {
        resultComment: getOrUndefined(resultComment),
        resultContent,
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.REJECTED, {
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
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (isNil(wasteGeneratorBaseline)) {
      return {
        resultComment:
          RESULT_COMMENTS.MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE(
            wasteSubtype,
          ),
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const avoidedEmissionsBaseline =
      AVOIDED_EMISSIONS_BY_MATERIAL_AND_BASELINE_PER_TON[wasteSubtype][
        wasteGeneratorBaseline
      ];

    const avoidedEmissions = this.calculateAvoidedEmissions(
      exceedingEmissionCoefficient,
      avoidedEmissionsBaseline,
      massIdDocumentValue,
    );

    return {
      resultComment: RESULT_COMMENTS.APPROVED(
        avoidedEmissions,
        exceedingEmissionCoefficient,
        massIdDocumentValue,
      ),
      resultContent: {
        avoidedEmissions,
      },
      resultStatus: RuleOutputStatus.APPROVED,
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

    const wasteGeneratorBaseline = this.getWasteGeneratorBaselineByWasteSubtype(
      wasteGeneratorHomologationDocument,
      massIdDocument.subtype,
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

  private calculateAvoidedEmissions(
    exceedingEmissionCoefficient: number,
    avoidedEmissionsBaseline: number,
    massIdDocumentValue: number,
  ): number {
    return (
      (1 - exceedingEmissionCoefficient) *
      avoidedEmissionsBaseline *
      massIdDocumentValue
    );
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

    this.throwIfMissing(
      recyclerHomologationDocument,
      this.processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_HOMOLOGATION_DOCUMENT,
    );

    this.throwIfMissing(
      massIdDocument,
      this.processorErrors.ERROR_MESSAGE.MISSING_MASS_ID_DOCUMENT,
    );

    this.throwIfMissing(
      wasteGeneratorHomologationDocument,
      this.processorErrors.ERROR_MESSAGE
        .MISSING_WASTE_GENERATOR_HOMOLOGATION_DOCUMENT,
    );

    return {
      massIdDocument: massIdDocument as Document,
      recyclerHomologationDocument: recyclerHomologationDocument as Document,
      wasteGeneratorHomologationDocument:
        wasteGeneratorHomologationDocument as Document,
    };
  }

  private getWasteGeneratorBaselineByWasteSubtype(
    wasteGeneratorHomologationDocument: Document,
    wasteSubtype: MassIdOrganicSubtype,
  ): MethodologyBaseline | undefined {
    const recyclingBaselineEvent =
      wasteGeneratorHomologationDocument.externalEvents?.find(
        (event) => event.name === RECYCLING_BASELINES.toString(),
      );

    const baselines = getEventAttributeValue(recyclingBaselineEvent, BASELINES);

    if (!is<WasteGeneratorBaselineValues>(baselines)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE.INVALID_WASTE_GENERATOR_BASELINES,
      );
    }

    return baselines[wasteSubtype];
  }

  private throwIfMissing<T>(value: T | undefined, errorMessage: string): void {
    if (isNil(value)) {
      throw this.processorErrors.getKnownError(errorMessage);
    }
  }
}
