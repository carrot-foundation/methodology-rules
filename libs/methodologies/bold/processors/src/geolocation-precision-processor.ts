import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/methodologies/bold/io-helpers';
import {
  MASS,
  PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH,
} from '@carrot-fndn/methodologies/bold/matchers';
import {
  and,
  eventNameIsAnyOf,
  isOpenEvent,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  type Address,
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentEventName,
  DocumentSubtype,
} from '@carrot-fndn/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/methodologies/bold/utils';
import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNil } from '@carrot-fndn/shared/helpers';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import {
  compareAddresses,
  getParticipantHomologationDocument,
  homologationIsNotExpired,
  participantHomologationCriteria,
} from './geolocation-precision.helpers';

const { MOVE, OPEN } = DocumentEventName;
const { MOVE_TYPE } = DocumentEventAttributeName;

export interface RuleSubject {
  homologationDocument?: Document | undefined;
  massDocumentAddress?: Address | undefined;
}

export abstract class GeolocationPrecisionRuleProcessor extends RuleDataProcessor {
  ResultComment = {
    EVENT_NOT_FOUND: 'Rule not applicable: The MOVE event was not found',
    HOMOLOGATION_ADDRESS_NOT_FOUND: 'Homologation address was not found',
    HOMOLOGATION_DOCUMENT_NOT_FOUND: 'Homologation document was not found',
    HOMOLOGATION_EXPIRED: 'Homologation has expired',
    REJECTED: 'The address geolocation precision is greater than 2',
  };

  private createResultOutput(isValid: boolean) {
    return {
      resultStatus: isValid
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED,
    };
  }

  private evaluateResult({
    homologationDocument,
    massDocumentAddress,
  }: RuleSubject): EvaluateResultOutput {
    if (isNil(massDocumentAddress)) {
      return {
        resultComment: this.ResultComment.EVENT_NOT_FOUND,
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    if (isNil(homologationDocument)) {
      return {
        resultComment: this.ResultComment.HOMOLOGATION_DOCUMENT_NOT_FOUND,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const homologationAddress =
      homologationDocument.externalEvents?.find(isOpenEvent)?.address;

    if (isNil(homologationAddress)) {
      return {
        resultComment: this.ResultComment.HOMOLOGATION_ADDRESS_NOT_FOUND,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    if (!homologationIsNotExpired(homologationDocument)) {
      return {
        resultComment: this.ResultComment.HOMOLOGATION_EXPIRED,
        resultStatus: RuleOutputStatus.REJECTED,
      };
    }

    const isSameAddress = compareAddresses(
      massDocumentAddress,
      homologationAddress,
    );

    return this.createResultOutput(isSameAddress);
  }

  private async getRuleSubject(
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<RuleSubject> {
    const homologationDocuments: Document[] = [];
    let massDocumentEvent: DocumentEvent | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentReference = mapDocumentReference(document);

      if (
        PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH.matches({
          ...documentReference,
          subtype: this.participantHomologationSubtype,
        })
      ) {
        homologationDocuments.push(document);
      }

      if (MASS.matches(documentReference)) {
        massDocumentEvent = document.externalEvents?.find(
          and(
            eventNameIsAnyOf([MOVE, OPEN]),
            metadataAttributeValueIsAnyOf(MOVE_TYPE, [this.moveTypeValue]),
          ),
        );
      }
    });

    if (isNil(massDocumentEvent)) {
      return {};
    }

    const participantHomologationDocument = getParticipantHomologationDocument({
      homologationDocuments,
      participantId: massDocumentEvent.participant.id,
    });

    return {
      homologationDocument: participantHomologationDocument,
      massDocumentAddress: massDocumentEvent.address,
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
      criteria: participantHomologationCriteria(
        this.participantHomologationSubtype,
      ),
      documentId: ruleInput.documentId,
    });
  }

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const documentsQuery = await this.generateDocumentQuery(ruleInput);

    const ruleSubject = await this.getRuleSubject(documentsQuery);

    const { resultComment, resultStatus } = this.evaluateResult(ruleSubject);

    return mapToRuleOutput(
      ruleInput,
      resultStatus,
      resultComment ? { resultComment } : undefined,
    );
  }

  protected abstract moveTypeValue: DocumentEventMoveType;

  protected abstract participantHomologationSubtype: DocumentSubtype;
}
