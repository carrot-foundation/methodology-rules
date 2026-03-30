import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonEmptyString,
  isNonNegative,
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
  type BoldDocument,
  DocumentEventAttributeName,
  DocumentSubtype,
  MassIDOrganicSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';
import { getYear } from 'date-fns';

import { RESULT_COMMENTS } from './prevented-emissions.constants';
import { PreventedEmissionsProcessorErrors } from './prevented-emissions.errors';
import {
  calculatePreventedEmissions,
  getBaselineByWasteSubtype,
  getGasTypeFromEvent,
  getPreventedEmissionsFactor,
  throwIfMissing,
} from './prevented-emissions.helpers';
import {
  buildOthersIfOrganicContext,
  getOthersIfOrganicAuditDetails,
  getOthersIfOrganicContextFromMassIdDocument,
  OthersIfOrganicAuditDetails,
} from './prevented-emissions.others-organic.helpers';
import { type RuleSubject } from './prevented-emissions.types';

const { EXCEEDING_EMISSION_COEFFICIENT } = DocumentEventAttributeName;

interface Documents {
  massIDDocument: BoldDocument;
  recyclerAccreditationDocument: BoldDocument;
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
      return mapToRuleOutput(ruleInput, 'FAILED', {
        resultComment: this.processorErrors.getResultCommentFromError(error),
      });
    }
  }

  protected evaluateResult(ruleSubject: RuleSubject): EvaluateResultOutput {
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

    const othersIfOrganicContext = buildOthersIfOrganicContext(ruleSubject);

    const preventedEmissionsByWasteSubtypeAndBaselinePerTon =
      getPreventedEmissionsFactor(
        wasteSubtype,
        baseline,
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
        baseline,
      );
    }

    return {
      resultComment: RESULT_COMMENTS.passed.EMISSIONS_CALCULATED(
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
  }: Documents): RuleSubject {
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
      baseline,
      wasteSubtype,
    };
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<BoldDocument> | undefined,
  ): Promise<Documents> {
    let recyclerAccreditationDocument: BoldDocument | undefined;
    let massIDDocument: BoldDocument | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (
        PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation) &&
        documentRelation.subtype === DocumentSubtype.RECYCLER.toString()
      ) {
        recyclerAccreditationDocument = document;
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
      massIDDocument: massIDDocument as BoldDocument,
      recyclerAccreditationDocument: recyclerAccreditationDocument as BoldDocument,
    };
  }
}
