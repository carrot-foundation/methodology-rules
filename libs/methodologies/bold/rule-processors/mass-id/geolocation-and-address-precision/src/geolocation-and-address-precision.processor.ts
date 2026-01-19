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
  MassIDDocumentActorType,
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
  getAccreditedAddressByParticipantIdAndActorType,
  getEventGpsGeolocation,
} from './geolocation-and-address-precision.helpers';

const { DROP_OFF, PICK_UP } = DocumentEventName;

const MAX_ALLOWED_DISTANCE = 2000;

export interface RuleSubject {
  participantsAddressData: Map<MassIDDocumentActorType, ParticipantAddressData>;
}

interface ParticipantAddressData {
  accreditedAddress: MethodologyAddress | undefined;
  eventAddress: MethodologyAddress;
  gpsGeolocation: Geolocation | undefined;
}

export const RESULT_COMMENTS = {
  INVALID_ACTOR_TYPE: 'Could not extract the event actor type.',
  INVALID_ADDRESS_DISTANCE: (
    actorType: string,
    addressDistance: number,
  ): string =>
    `Non-compliant ${actorType} address: the event address is ${addressDistance}m away from the accredited address, exceeding the ${MAX_ALLOWED_DISTANCE}m limit.`,
  INVALID_GPS_DISTANCE: (actorType: string, gpsDistance: number): string =>
    `Non-compliant ${actorType} address: the captured GPS location is ${gpsDistance}m away from the accredited address, exceeding the ${MAX_ALLOWED_DISTANCE}m limit.`,
  MISSING_ACCREDITATION_ADDRESS: (actorType: string): string =>
    `No accredited address was found for the ${actorType} actor.`,
  PASSED_WITH_GPS: (
    actorType: string,
    addressDistance: number,
    gpsDistance: number,
  ): string =>
    `Compliant ${actorType} address: the event address is within ${MAX_ALLOWED_DISTANCE}m of the accredited address (${addressDistance}m), and the GPS location is within ${MAX_ALLOWED_DISTANCE}m of the event address (${gpsDistance}m).`,
  PASSED_WITHOUT_GPS: (actorType: string, addressDistance: number): string =>
    `Compliant ${actorType} address: the event address is within ${MAX_ALLOWED_DISTANCE}m of the accredited address (${addressDistance}m) (note: no GPS data was provided).`,
} as const;

export class GeolocationAndAddressPrecisionProcessor extends RuleDataProcessor {
  private processorErrors = new GeolocationAndAddressPrecisionProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    try {
      const massIDAuditDocument = await loadDocument(
        this.context.documentLoaderService,
        toDocumentKey({
          documentId: ruleInput.documentId,
          documentKeyPrefix: ruleInput.documentKeyPrefix,
        }),
      );

      if (isNil(massIDAuditDocument)) {
        throw this.processorErrors.getKnownError(
          this.processorErrors.ERROR_MESSAGE.MASS_ID_AUDIT_DOCUMENT_NOT_FOUND,
        );
      }

      const documentsQuery = await this.generateDocumentQuery(ruleInput);
      const ruleSubject = await this.getRuleSubject(
        massIDAuditDocument,
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
    actorResults: Map<MassIDDocumentActorType, EvaluateResultOutput[]>,
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
    massIDDocument: Document,
    massIDAuditDocument: Document,
    accreditationDocuments: Document[],
  ) {
    const participantsAddressData = new Map<
      MassIDDocumentActorType,
      ParticipantAddressData
    >();

    for (const event of events) {
      const actorType = getParticipantActorType({
        document: massIDDocument,
        event,
      });

      if (isNil(actorType)) {
        throw this.processorErrors.getKnownError(
          RESULT_COMMENTS.INVALID_ACTOR_TYPE,
        );
      }

      participantsAddressData.set(actorType, {
        accreditedAddress: getAccreditedAddressByParticipantIdAndActorType(
          massIDAuditDocument,
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
    accreditedAddress: MethodologyAddress,
  ): number {
    return calculateDistance(eventAddress, accreditedAddress);
  }

  private calculateGpsDistance(
    accreditedAddress: MethodologyAddress,
    gpsGeolocation: Geolocation,
  ): number {
    return calculateDistance(accreditedAddress, gpsGeolocation);
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<Document> | undefined,
  ) {
    const accreditationDocuments: Document[] = [];
    let massIDDocument: Document | undefined;

    await documentQuery?.iterator().each(({ document }) => {
      const documentRelation = mapDocumentRelation(document);

      if (PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(documentRelation)) {
        accreditationDocuments.push(document);
      }

      if (MASS_ID.matches(documentRelation)) {
        massIDDocument = document;
      }
    });

    if (!isNonEmptyArray(accreditationDocuments)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE
          .PARTICIPANT_ACCREDITATION_DOCUMENTS_NOT_FOUND,
      );
    }

    return { accreditationDocuments, massIDDocument };
  }

  private evaluateAddressData(
    actorType: MassIDDocumentActorType,
    addressData: ParticipantAddressData,
  ): EvaluateResultOutput[] {
    const { accreditedAddress, eventAddress, gpsGeolocation } = addressData;

    if (isNil(accreditedAddress)) {
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
      accreditedAddress,
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
        accreditedAddress,
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
      MassIDDocumentActorType,
      EvaluateResultOutput[]
    >();

    for (const [actorType, addressData] of participantsAddressData) {
      const results = this.evaluateAddressData(actorType, addressData);

      actorResults.set(actorType, results);
    }

    return this.aggregateResults(actorResults);
  }

  private extractRequiredEvents(massIDDocument: Document) {
    const events = massIDDocument.externalEvents?.filter(
      eventNameIsAnyOf([DROP_OFF, PICK_UP]),
    );

    if (!isNonEmptyArray(events)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_DOES_NOT_CONTAIN_REQUIRED_EVENTS(
          massIDDocument.id,
        ),
      );
    }

    return events;
  }

  private async getRuleSubject(
    massIDAuditDocument: Document,
    documentQuery: DocumentQuery<Document> | undefined,
  ): Promise<RuleSubject> {
    const documents = await this.collectDocuments(documentQuery);
    const massIDDocument = this.validateMassIDDocument(
      documents.massIDDocument,
    );
    const pickUpAndDropOffEvents = this.extractRequiredEvents(massIDDocument);

    return {
      participantsAddressData: this.buildParticipantsAddressData(
        pickUpAndDropOffEvents,
        massIDDocument,
        massIDAuditDocument,
        documents.accreditationDocuments,
      ),
    };
  }

  private validateMassIDDocument(
    massIDDocument: Document | undefined,
  ): Document {
    if (isNil(massIDDocument)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      );
    }

    return massIDDocument;
  }
}
