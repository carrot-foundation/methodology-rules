import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type {
  Geolocation,
  MethodologyAddress,
} from '@carrot-fndn/shared/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  calculateDistance,
  getOrUndefined,
  isNil,
  isNonEmptyArray,
  toDocumentKey,
} from '@carrot-fndn/shared/helpers';
import { getParticipantActorType } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  type DocumentQuery,
  DocumentQueryService,
  loadDocument,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  MASS_ID,
  PARTICIPANT_ACCREDITATION_PARTIAL_MATCH,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventName,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';

import { GeolocationAndAddressPrecisionProcessorErrors } from './geolocation-and-address-precision.errors';
import {
  getAccreditatedAddressByParticipantIdAndActorType,
  getEventGpsGeolocation,
} from './geolocation-and-address-precision.helpers';

const { DROP_OFF, PICK_UP } = DocumentEventName;

const MAX_ALLOWED_DISTANCE = 2000;

export interface RuleSubject {
  participantsAddressData: Map<MassIdDocumentActorType, ParticipantAddressData>;
}

interface ParticipantAddressData {
  accreditatedAddress: MethodologyAddress | undefined;
  eventAddress: MethodologyAddress;
  gpsGeolocation: Geolocation | undefined;
}

export const RESULT_COMMENTS = {
  INVALID_ACTOR_TYPE: 'Could not extract the event actor type.',
  INVALID_ADDRESS_DISTANCE: (
    actorType: string,
    addressDistance: number,
  ): string =>
    `(${actorType}) The event address is ${addressDistance}m away from the accreditated address, exceeding the ${MAX_ALLOWED_DISTANCE}m limit.`,
  INVALID_GPS_DISTANCE: (actorType: string, gpsDistance: number): string =>
    `(${actorType}) The captured GPS location is ${gpsDistance}m away from the accreditated address, exceeding the ${MAX_ALLOWED_DISTANCE}m limit.`,
  MISSING_ACCREDITATION_ADDRESS: (actorType: string): string =>
    `No accreditated address was found for the ${actorType} actor.`,
  PASSED_WITH_GPS: (
    actorType: string,
    addressDistance: number,
    gpsDistance: number,
  ): string =>
    `(${actorType}) The event address is within ${MAX_ALLOWED_DISTANCE}m of the accreditated address (${addressDistance}m), and the GPS location is within ${MAX_ALLOWED_DISTANCE}m of the event address (${gpsDistance}m).`,
  PASSED_WITHOUT_GPS: (actorType: string, addressDistance: number): string =>
    `(${actorType}) The event address is within ${MAX_ALLOWED_DISTANCE}m of the accreditated address (${addressDistance}m). No GPS data was provided.`,
} as const;

export class GeolocationAndAddressPrecisionProcessor extends RuleDataProcessor {
  private processorErrors = new GeolocationAndAddressPrecisionProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const massIdAuditDocument = await loadDocument(
        this.context.documentLoaderService,
        toDocumentKey({
          documentId: ruleInput.documentId,
          documentKeyPrefix: ruleInput.documentKeyPrefix,
        }),
      );

      if (isNil(massIdAuditDocument)) {
        throw this.processorErrors.getKnownError(
          this.processorErrors.ERROR_MESSAGE.MASS_ID_AUDIT_DOCUMENT_NOT_FOUND,
        );
      }

      const documentsQuery = await this.generateDocumentQuery(ruleInput);
      const ruleSubject = await this.getRuleSubject(
        massIdAuditDocument,
        documentsQuery,
      );
      const { resultComment, resultStatus } = this.evaluateResult(ruleSubject);

      return mapToRuleOutput(ruleInput, resultStatus, {
        resultComment: getOrUndefined(resultComment),
      });
    } catch (error: unknown) {
      return mapToRuleOutput(ruleInput, RuleOutputStatus.FAILED, {
        resultComment: this.processorErrors.getResultCommentFromError(error),
      });
    }
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

  private aggregateResults(
    actorResults: Map<MassIdDocumentActorType, EvaluateResultOutput[]>,
  ): EvaluateResultOutput {
    const allResults = [...actorResults.values()].flat();

    const passed = allResults.every(
      (result) => result.resultStatus === RuleOutputStatus.PASSED,
    );

    const resultComment = allResults
      .map((result) => result.resultComment)
      .join(' ');

    return {
      resultComment,
      resultStatus: passed ? RuleOutputStatus.PASSED : RuleOutputStatus.FAILED,
    };
  }

  private buildParticipantsAddressData(
    events: NonNullable<Document['externalEvents']>,
    massIdDocument: Document,
    massIdAuditDocument: Document,
    accreditationDocuments: Document[],
  ) {
    const participantsAddressData = new Map<
      MassIdDocumentActorType,
      ParticipantAddressData
    >();

    for (const event of events) {
      const actorType = getParticipantActorType({
        document: massIdDocument,
        event,
      });

      if (isNil(actorType)) {
        throw this.processorErrors.getKnownError(
          RESULT_COMMENTS.INVALID_ACTOR_TYPE,
        );
      }

      participantsAddressData.set(actorType, {
        accreditatedAddress: getAccreditatedAddressByParticipantIdAndActorType(
          massIdAuditDocument,
          event.participant.id,
          actorType,
          accreditationDocuments,
        ),
        eventAddress: event.address,
        gpsGeolocation: getEventGpsGeolocation(event),
      });
    }

    return participantsAddressData;
  }

  private calculateAddressDistance(
    eventAddress: MethodologyAddress,
    accreditatedAddress: MethodologyAddress,
  ): number {
    return calculateDistance(eventAddress, accreditatedAddress);
  }

  private calculateGpsDistance(
    accreditatedAddress: MethodologyAddress,
    gpsGeolocation: Geolocation,
  ): number {
    return calculateDistance(accreditatedAddress, gpsGeolocation);
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<Document> | undefined,
  ) {
    const accreditationDocuments: Document[] = [];
    let massIdDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation)) {
        accreditationDocuments.push(document);
      }

      if (MASS_ID.matches(documentRelation)) {
        massIdDocument = document;
      }
    });

    if (!isNonEmptyArray(accreditationDocuments)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE
          .PARTICIPANT_ACCREDITATION_DOCUMENTS_NOT_FOUND,
      );
    }

    return { accreditationDocuments, massIdDocument };
  }

  private evaluateAddressData(
    actorType: MassIdDocumentActorType,
    addressData: ParticipantAddressData,
  ): EvaluateResultOutput[] {
    const { accreditatedAddress, eventAddress, gpsGeolocation } = addressData;

    if (isNil(accreditatedAddress)) {
      return [
        {
          resultComment:
            RESULT_COMMENTS.MISSING_ACCREDITATION_ADDRESS(actorType),
          resultStatus: RuleOutputStatus.FAILED,
        },
      ];
    }

    const addressDistance = this.calculateAddressDistance(
      eventAddress,
      accreditatedAddress,
    );

    if (addressDistance > MAX_ALLOWED_DISTANCE) {
      return [
        {
          resultComment: RESULT_COMMENTS.INVALID_ADDRESS_DISTANCE(
            actorType,
            addressDistance,
          ),
          resultStatus: RuleOutputStatus.FAILED,
        },
      ];
    }

    if (!isNil(gpsGeolocation)) {
      const gpsDistance = this.calculateGpsDistance(
        accreditatedAddress,
        gpsGeolocation,
      );

      if (gpsDistance > MAX_ALLOWED_DISTANCE) {
        return [
          {
            resultComment: RESULT_COMMENTS.INVALID_GPS_DISTANCE(
              actorType,
              gpsDistance,
            ),
            resultStatus: RuleOutputStatus.FAILED,
          },
        ];
      }

      return [
        {
          resultComment: RESULT_COMMENTS.PASSED_WITH_GPS(
            actorType,
            addressDistance,
            gpsDistance,
          ),
          resultStatus: RuleOutputStatus.PASSED,
        },
      ];
    }

    return [
      {
        resultComment: RESULT_COMMENTS.PASSED_WITHOUT_GPS(
          actorType,
          addressDistance,
        ),
        resultStatus: RuleOutputStatus.PASSED,
      },
    ];
  }

  private evaluateResult({
    participantsAddressData,
  }: RuleSubject): EvaluateResultOutput {
    const actorResults = new Map<
      MassIdDocumentActorType,
      EvaluateResultOutput[]
    >();

    for (const [actorType, addressData] of participantsAddressData) {
      const results = this.evaluateAddressData(actorType, addressData);

      actorResults.set(actorType, results);
    }

    return this.aggregateResults(actorResults);
  }

  private extractRequiredEvents(massIdDocument: Document) {
    const events = massIdDocument.externalEvents?.filter(
      eventNameIsAnyOf([DROP_OFF, PICK_UP]),
    );

    if (!isNonEmptyArray(events)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS(
          massIdDocument.id,
        ),
      );
    }

    return events;
  }

  private async getRuleSubject(
    massIdAuditDocument: Document,
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<RuleSubject> {
    const documents = await this.collectDocuments(documentQuery);
    const massIdDocument = this.validateMassIdDocument(
      documents.massIdDocument,
    );
    const pickUpAndDropOffEvents = this.extractRequiredEvents(massIdDocument);

    return {
      participantsAddressData: this.buildParticipantsAddressData(
        pickUpAndDropOffEvents,
        massIdDocument,
        massIdAuditDocument,
        documents.accreditationDocuments,
      ),
    };
  }

  private validateMassIdDocument(
    massIdDocument: Document | undefined,
  ): Document {
    if (isNil(massIdDocument)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      );
    }

    return massIdDocument;
  }
}
