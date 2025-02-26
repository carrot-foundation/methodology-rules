import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { isNil } from '@carrot-fndn/shared/helpers';
import {
  getParticipantHomologationDocumentById,
  homologationIsNotExpired,
} from '@carrot-fndn/shared/methodologies/bold/helpers';
import {
  type DocumentQuery,
  DocumentQueryService,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS,
  PARTICIPANT_HOMOLOGATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  isOpenEvent,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventMoveType,
  DocumentSubtype,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentReference } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import {
  compareAddresses,
  isMetadataGeolocationValid,
  mapMassDocumentAddress,
  participantHomologationCriteria,
} from './geolocation-precision.helpers';

const { MOVE_TYPE } = DocumentEventAttributeName;

export interface RuleSubject {
  homologationDocument?: Document | undefined;
  massDocumentEvent?: DocumentEvent | undefined;
}

export abstract class GeolocationPrecisionRuleProcessor extends RuleDataProcessor {
  ResultComment = {
    EVENT_NOT_FOUND: 'Rule not applicable: The EVENT was not found',
    HOMOLOGATION_ADDRESS_NOT_FOUND: 'Homologation address was not found',
    HOMOLOGATION_DOCUMENT_NOT_FOUND: 'Homologation document was not found',
    HOMOLOGATION_EXPIRED: 'Homologation document has expired',
    METADATA_GEOLOCATION_INVALID:
      'The app-gps geolocation data type is invalid',
    REJECTED: 'The address geolocation precision is greater than 2',
  } as const;

  private evaluateResult({
    homologationDocument,
    massDocumentEvent,
  }: RuleSubject): EvaluateResultOutput {
    if (isNil(massDocumentEvent)) {
      return {
        resultComment: this.ResultComment.EVENT_NOT_FOUND,
        resultStatus: RuleOutputStatus.APPROVED,
      };
    }

    const valid = isMetadataGeolocationValid(massDocumentEvent);

    if (!valid) {
      return {
        resultComment: this.ResultComment.METADATA_GEOLOCATION_INVALID,
        resultStatus: RuleOutputStatus.REJECTED,
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
      mapMassDocumentAddress(massDocumentEvent),
      homologationAddress,
    );

    return {
      resultComment: isSameAddress ? undefined : this.ResultComment.REJECTED,
      resultStatus: isSameAddress
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED,
    };
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
          metadataAttributeValueIsAnyOf(MOVE_TYPE, this.moveTypeValues),
        );
      }
    });

    if (isNil(massDocumentEvent)) {
      return {};
    }

    const participantHomologationDocument =
      getParticipantHomologationDocumentById({
        homologationDocuments,
        participantId: massDocumentEvent.participant.id,
      });

    return {
      homologationDocument: participantHomologationDocument,
      massDocumentEvent,
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

  protected abstract moveTypeValues: DocumentEventMoveType[];

  protected abstract participantHomologationSubtype: DocumentSubtype;
}
