import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { MethodologyDocumentEventAttributeValue } from '@carrot-fndn/shared/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  getOrUndefined,
  isNil,
  isNonZeroPositive,
} from '@carrot-fndn/shared/helpers';
import { getFirstDocumentEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
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
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { AvoidedEmissionsProcessorErrors } from './avoided-emissions.errors';

const { PROJECT_EMISSION_CALCULATION_INDEX } = DocumentEventAttributeName;

export const RESULT_COMMENTS = {
  APPROVED: (
    avoidedEmissions: number,
    emissionIndex: number,
    currentValue: number,
  ) =>
    `The avoided emissions were calculated as ${avoidedEmissions} kg CO₂e using the formula ${emissionIndex} × ${currentValue} = ${avoidedEmissions} [formula: emission_index × current_value = avoided_emissions].`,
  MISSING_INDEX: `The "${PROJECT_EMISSION_CALCULATION_INDEX}" attribute was not found in the "Recycler Homologation" document or it is invalid.`,
} as const;

interface DocumentPair {
  massIdDocument: Document;
  recyclerHomologationDocument: Document;
}

interface RuleSubject {
  emissionIndex: MethodologyDocumentEventAttributeValue | undefined;
  massIdDocumentValue: number;
}

export class AvoidedEmissionsProcessor extends RuleDataProcessor {
  protected readonly processorErrors = new AvoidedEmissionsProcessorErrors();

  private async collectDocuments(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<DocumentPair> {
    let recyclerHomologationDocument: Document | undefined;
    let massIdDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (
        PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.matches(documentReference) &&
        documentReference.subtype === DocumentSubtype.RECYCLER
      ) {
        recyclerHomologationDocument = document;
      }

      if (MASS_ID.matches(documentReference)) {
        massIdDocument = document;
      }
    });

    this.validateOrThrow(
      isNil(recyclerHomologationDocument),
      this.processorErrors.ERROR_MESSAGE.MISSING_RECYCLER_HOMOLOGATION_DOCUMENT,
    );

    this.validateOrThrow(
      isNil(massIdDocument),
      this.processorErrors.ERROR_MESSAGE.MISSING_MASS_ID_DOCUMENT,
    );

    return {
      massIdDocument: massIdDocument as Document,
      recyclerHomologationDocument: recyclerHomologationDocument as Document,
    };
  }

  private validateOrThrow(condition: boolean, errorMessage: string): void {
    if (condition) {
      throw this.processorErrors.getKnownError(errorMessage);
    }
  }

  protected evaluateResult(ruleSubject: RuleSubject): EvaluateResultOutput {
    const { emissionIndex, massIdDocumentValue } = ruleSubject;

    if (!isNonZeroPositive(emissionIndex)) {
      return {
        resultComment: RESULT_COMMENTS.MISSING_INDEX,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const avoidedEmissions = emissionIndex * massIdDocumentValue;

    return {
      resultComment: RESULT_COMMENTS.APPROVED(
        avoidedEmissions,
        emissionIndex,
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
  }: DocumentPair): RuleSubject {
    return {
      emissionIndex: getFirstDocumentEventAttributeValue(
        recyclerHomologationDocument,
        PROJECT_EMISSION_CALCULATION_INDEX,
      ),
      massIdDocumentValue: massIdDocument.currentValue,
    };
  }

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
}
