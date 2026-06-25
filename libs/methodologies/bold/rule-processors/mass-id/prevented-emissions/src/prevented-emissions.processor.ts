import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { getEnableReviewRequired } from '@carrot-fndn/shared/env';
import {
  getOrUndefined,
  isNil,
  isNonEmptyString,
  isNonNegative,
  logger,
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
import { validateRuleSubjectOrThrow } from '@carrot-fndn/shared/methodologies/bold/processors';
import {
  BoldAttributeName,
  BoldBaseline,
  type BoldDocument,
  BoldDocumentEventName,
  BoldDocumentSubtype,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';
import { getYear } from 'date-fns';

import { type StaticFactorSubtype } from './prevented-emissions.constants';
import { RESULT_COMMENTS } from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import {
  calculatePreventedEmissions,
  getBaselineByWasteSubtype,
  getGasTypeFromEvent,
  getStaticPreventedEmissionsFactor,
  throwIfMissing,
} from './prevented-emissions.helpers';
import {
  buildOthersIfOrganicAuditDetails,
  buildOthersIfOrganicContext,
  calculateOthersIfOrganicFactor,
  getGeneratorCarbonCharacterization,
  getOthersIfOrganicContextFromMassIdDocument,
  resolveOthersIfOrganicCarbonFraction,
} from './prevented-emissions.others-organic.helpers';
import {
  type PreventedEmissionsRuleSubject,
  PreventedEmissionsRuleSubjectSchema,
} from './prevented-emissions.rule-subject';
import { type GeneratorCarbonCharacterization } from './prevented-emissions.types';

const { EXCEEDING_EMISSION_COEFFICIENT } = BoldAttributeName;
const { PICK_UP } = BoldDocumentEventName;

interface Documents {
  massIDDocument: BoldDocument;
  recyclerAccreditationDocument: BoldDocument;
  wasteGeneratorAccreditationDocument?: BoldDocument;
}

export class PreventedEmissionsProcessor extends RuleDataProcessor {
  protected readonly processorErrors = new PreventedEmissionsProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const documentsQuery = await this.generateDocumentQuery(ruleInput);
      const documents = await this.collectDocuments(documentsQuery);
      const ruleSubject = this.getRuleSubject(documents);

      const validatedSubject = validateRuleSubjectOrThrow({
        errors: this.processorErrors,
        input: ruleSubject,
        schema: PreventedEmissionsRuleSubjectSchema,
        validationMessage:
          this.processorErrors.ERROR_MESSAGE.INVALID_RULE_SUBJECT,
      });

      const { resultComment, resultContent, resultStatus } =
        this.evaluateResult(validatedSubject);

      return mapToRuleOutput(ruleInput, resultStatus, {
        resultComment: getOrUndefined(resultComment),
        resultContent: {
          ...resultContent,
          ruleSubject: validatedSubject,
        },
      });
    } catch (error: unknown) {
      logger.error(
        {
          documentId: ruleInput.documentId,
          err: error,
          operation: 'prevented-emissions:process',
          ruleId: ruleInput.ruleName,
        },
        'Prevented-emissions processor failed',
      );

      return mapToRuleOutput(ruleInput, 'FAILED', {
        resultComment: this.processorErrors.getResultCommentFromError(error),
      });
    }
  }

  protected evaluateResult(
    ruleSubject: PreventedEmissionsRuleSubject,
  ): EvaluateResultOutput {
    const {
      baseline,
      exceedingEmissionCoefficient,
      massIDDocumentValue,
      wasteSubtype,
    } = ruleSubject;

    if (!isNonNegative(exceedingEmissionCoefficient)) {
      return {
        resultComment:
          RESULT_COMMENTS.failed.MISSING_EXCEEDING_EMISSION_COEFFICIENT,
        resultStatus: 'FAILED',
      };
    }

    if (isNil(baseline)) {
      return {
        resultComment:
          RESULT_COMMENTS.failed.MISSING_RECYCLING_BASELINE_FOR_WASTE_SUBTYPE(
            wasteSubtype,
          ),
        resultStatus: 'FAILED',
      };
    }

    if (wasteSubtype === MassIDOrganicSubtype.OTHERS_IF_ORGANIC) {
      return this.evaluateOthersIfOrganicResult(
        ruleSubject,
        baseline,
        exceedingEmissionCoefficient,
        massIDDocumentValue,
      );
    }

    // The OTHERS_IF_ORGANIC early-return above precedes this line, so every
    // remaining subtype is a StaticFactorSubtype; the helper still guards the
    // lookup and throws a known error rather than returning NaN if it misses.
    const staticFactor = getStaticPreventedEmissionsFactor(
      wasteSubtype as StaticFactorSubtype,
      baseline,
      this.processorErrors,
    );
    const preventedEmissions = calculatePreventedEmissions(
      exceedingEmissionCoefficient,
      staticFactor,
      massIDDocumentValue,
    );

    return {
      resultComment: RESULT_COMMENTS.passed.EMISSIONS_CALCULATED(
        preventedEmissions,
        staticFactor,
        exceedingEmissionCoefficient,
        massIDDocumentValue,
      ),
      resultContent: {
        gasType: ruleSubject.gasType,
        preventedCo2e: preventedEmissions,
      },
      resultStatus: 'PASSED',
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
    wasteGeneratorAccreditationDocument,
  }: Documents): PreventedEmissionsRuleSubject {
    const lastEmissionAndCompostingMetricsEvent =
      getLastYearEmissionAndCompostingMetricsEvent({
        documentWithEmissionAndCompostingMetricsEvent:
          recyclerAccreditationDocument,
        documentYear: getYear(massIDDocument.externalCreatedAt),
      });

    const gasType = getGasTypeFromEvent(lastEmissionAndCompostingMetricsEvent);

    if (
      !(Object.values(MassIDOrganicSubtype) as unknown[]).includes(
        massIDDocument.subtype,
      )
    ) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE.INVALID_MASS_ID_DOCUMENT_SUBTYPE,
      );
    }

    const wasteSubtype = massIDDocument.subtype as MassIDOrganicSubtype;

    const baseline = getBaselineByWasteSubtype(
      lastEmissionAndCompostingMetricsEvent,
      wasteSubtype,
      this.processorErrors,
    );

    const { localWasteClassificationId, normalizedLocalWasteClassificationId } =
      getOthersIfOrganicContextFromMassIdDocument(massIDDocument);

    const isOthersIfOrganic =
      wasteSubtype === MassIDOrganicSubtype.OTHERS_IF_ORGANIC;

    const pickUpEvent = massIDDocument.externalEvents?.find(
      (event) => event.name === PICK_UP.toString(),
    );
    const pickUpDate = isOthersIfOrganic
      ? (pickUpEvent?.externalCreatedAt ?? massIDDocument.externalCreatedAt)
      : undefined;

    const generatorCharacterization = isOthersIfOrganic
      ? getGeneratorCarbonCharacterization(
          wasteGeneratorAccreditationDocument,
          normalizedLocalWasteClassificationId,
        )
      : undefined;

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
      ...(isNonEmptyString(pickUpDate) && { pickUpDate }),
      ...(generatorCharacterization && {
        generatorCarbonAnalysisDate: generatorCharacterization.analysisDate,
        generatorCarbonFraction: generatorCharacterization.carbonFraction,
        generatorCarbonMoisture: generatorCharacterization.moistureFraction,
      }),
      baseline,
      wasteSubtype,
    };
  }

  private buildOthersIfOrganicTerminalResult(
    code: NonEmptyString,
    reason: 'expired' | 'missing',
    expiredComment: string,
  ): EvaluateResultOutput {
    if (getEnableReviewRequired()) {
      return {
        resultComment:
          reason === 'expired'
            ? expiredComment
            : RESULT_COMMENTS.reviewRequired.OTHERS_IF_ORGANIC_AWAITING_LAUDO(
                code,
              ),
        resultStatus: 'REVIEW_REQUIRED',
      };
    }

    return {
      resultComment:
        RESULT_COMMENTS.failed.OTHERS_IF_ORGANIC_NO_CARBON_FRACTION(code),
      resultStatus: 'FAILED',
    };
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<BoldDocument> | undefined,
  ): Promise<Documents> {
    let recyclerAccreditationDocument: BoldDocument | undefined;
    let wasteGeneratorAccreditationDocument: BoldDocument | undefined;
    let massIDDocument: BoldDocument | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation)) {
        if (
          documentRelation.subtype === BoldDocumentSubtype.RECYCLER.toString()
        ) {
          recyclerAccreditationDocument = document;
        }

        if (
          documentRelation.subtype ===
          BoldDocumentSubtype.WASTE_GENERATOR.toString()
        ) {
          wasteGeneratorAccreditationDocument = document;
        }
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

    return {
      massIDDocument,
      recyclerAccreditationDocument,
      ...(wasteGeneratorAccreditationDocument && {
        wasteGeneratorAccreditationDocument,
      }),
    };
  }

  private evaluateOthersIfOrganicResult(
    ruleSubject: PreventedEmissionsRuleSubject,
    baseline: BoldBaseline,
    exceedingEmissionCoefficient: number,
    massIDDocumentValue: number,
  ): EvaluateResultOutput {
    const generatorCharacterization:
      | GeneratorCarbonCharacterization
      | undefined =
      ruleSubject.generatorCarbonFraction &&
      ruleSubject.generatorCarbonAnalysisDate &&
      ruleSubject.generatorCarbonMoisture
        ? {
            analysisDate: ruleSubject.generatorCarbonAnalysisDate,
            carbonFraction: ruleSubject.generatorCarbonFraction,
            moistureFraction: ruleSubject.generatorCarbonMoisture,
          }
        : undefined;

    const resolution = resolveOthersIfOrganicCarbonFraction(
      buildOthersIfOrganicContext(ruleSubject),
      generatorCharacterization,
      ruleSubject.pickUpDate,
      this.processorErrors,
    );

    // `resolveOthersIfOrganicCarbonFraction` throws INVALID_CLASSIFICATION_ID
    // unless the normalized code is a non-empty string, so reaching this point
    // means the cast below is sound.
    const code =
      ruleSubject.normalizedLocalWasteClassificationId as NonEmptyString;

    if (!resolution.resolved) {
      const expiredComment =
        resolution.reason === 'expired' &&
        generatorCharacterization &&
        isNonEmptyString(ruleSubject.pickUpDate)
          ? RESULT_COMMENTS.reviewRequired.OTHERS_IF_ORGANIC_EXPIRED_FRACTION(
              code,
              generatorCharacterization.analysisDate,
              ruleSubject.pickUpDate,
            )
          : RESULT_COMMENTS.reviewRequired.OTHERS_IF_ORGANIC_AWAITING_LAUDO(
              code,
            );

      return this.buildOthersIfOrganicTerminalResult(
        code,
        resolution.reason,
        expiredComment,
      );
    }

    const othersFactor = calculateOthersIfOrganicFactor(
      baseline,
      resolution.carbonFraction,
    );
    const othersPreventedEmissions = calculatePreventedEmissions(
      exceedingEmissionCoefficient,
      othersFactor,
      massIDDocumentValue,
    );

    return {
      resultComment: RESULT_COMMENTS.passed.EMISSIONS_CALCULATED(
        othersPreventedEmissions,
        othersFactor,
        exceedingEmissionCoefficient,
        massIDDocumentValue,
      ),
      resultContent: {
        gasType: ruleSubject.gasType,
        othersIfOrganicAudit: {
          ...buildOthersIfOrganicAuditDetails(
            code,
            resolution.carbonFraction,
            baseline,
          ),
          source: resolution.source,
          ...(resolution.source === 'generator' && {
            analysisDate: resolution.analysisDate,
            moistureFraction: resolution.moistureFraction,
          }),
        },
        preventedCo2e: othersPreventedEmissions,
      },
      resultStatus: 'PASSED',
    };
  }
}
