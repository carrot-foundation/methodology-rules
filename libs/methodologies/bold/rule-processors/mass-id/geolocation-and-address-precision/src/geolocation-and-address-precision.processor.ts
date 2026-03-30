import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type { DocumentAddress, Geolocation } from '@carrot-fndn/shared/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import {
  calculateDistance,
  getOrUndefined,
  isAddressMatch,
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
  DocumentSubtype,
  MassIDDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapDocumentRelation } from '@carrot-fndn/shared/methodologies/bold/utils';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';

import {
  ADDRESS_SIMILARITY_THRESHOLD,
  DISTANCE_THRESHOLD_PASS,
  DISTANCE_THRESHOLD_SIMILARITY,
  GPS_MAX_ALLOWED_DISTANCE,
  RESULT_COMMENTS,
} from './geolocation-and-address-precision.constants';
import { GeolocationAndAddressPrecisionProcessorErrors } from './geolocation-and-address-precision.errors';
import {
  getAccreditedAddressByParticipantIdAndActorType,
  getEventGpsGeolocation,
  getGpsExceptionsFromRecyclerAccreditation,
  hasVerificationDocument,
  shouldSkipGpsValidation,
} from './geolocation-and-address-precision.helpers';

const { DROP_OFF, PICK_UP } = DocumentEventName;

export interface RuleSubject {
  accreditationDocuments: Document[];
  massIDAuditDocument: Document;
  participantsAddressData: Map<MassIDDocumentActorType, ParticipantAddressData>;
  recyclerAccreditationDocument: Document | undefined;
}

interface ParticipantAddressData {
  accreditedAddress: DocumentAddress | undefined;
  actorType: MassIDDocumentActorType;
  eventAddress: DocumentAddress;
  eventName: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP;
  gpsGeolocation: Geolocation | undefined;
  participantId: string;
}

export class GeolocationAndAddressPrecisionProcessor extends RuleDataProcessor {
  private readonly processorErrors =
    new GeolocationAndAddressPrecisionProcessorErrors();

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
      return mapToRuleOutput(ruleInput, 'FAILED', {
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

    const resultComment = allResults
      .map((result) => result.resultComment)
      .join(' ');

    const hasFailed = allResults.some(
      (result) => result.resultStatus === 'FAILED',
    );

    if (hasFailed) {
      return { resultComment, resultStatus: 'FAILED' };
    }

    const hasReviewRequired = allResults.some(
      (result) => result.resultStatus === 'REVIEW_REQUIRED',
    );

    if (hasReviewRequired) {
      return { resultComment, resultStatus: 'REVIEW_REQUIRED' };
    }

    return { resultComment, resultStatus: 'PASSED' };
  }

  private buildAddressComparisonString(address: DocumentAddress): string {
    return [address.street, address.number, address.city]
      .filter(Boolean)
      .join(', ');
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
          RESULT_COMMENTS.failed.INVALID_ACTOR_TYPE,
        );
      }

      participantsAddressData.set(actorType, {
        accreditedAddress: getAccreditedAddressByParticipantIdAndActorType(
          massIDAuditDocument,
          event.participant.id,
          actorType,
          accreditationDocuments,
        ),
        actorType,
        eventAddress: event.address,
        eventName: event.name as
          | DocumentEventName.DROP_OFF
          | DocumentEventName.PICK_UP,
        gpsGeolocation: getEventGpsGeolocation(event),
        participantId: event.participant.id,
      });
    }

    return participantsAddressData;
  }

  private calculateAddressDistance(
    eventAddress: DocumentAddress,
    accreditedAddress: DocumentAddress,
  ): number {
    return calculateDistance(eventAddress, accreditedAddress);
  }

  private calculateGpsDistance(
    accreditedAddress: DocumentAddress,
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
    recyclerAccreditationDocument: Document | undefined,
    massIDAuditDocument: Document,
    accreditationDocuments: Document[],
  ): EvaluateResultOutput[] {
    const {
      accreditedAddress,
      eventAddress,
      eventName,
      gpsGeolocation,
      participantId,
    } = addressData;

    if (actorType === MassIDDocumentActorType.WASTE_GENERATOR) {
      const verificationDocumentExists: boolean = Boolean(
        hasVerificationDocument(
          massIDAuditDocument,
          participantId,
          actorType,
          accreditationDocuments,
        ),
      );

      if (!verificationDocumentExists || isNil(accreditedAddress)) {
        return [
          {
            resultComment:
              RESULT_COMMENTS.passed.OPTIONAL_VALIDATION_SKIPPED(actorType),
            resultStatus: 'PASSED',
          },
        ];
      }
    }

    if (isNil(accreditedAddress)) {
      return [
        {
          resultComment:
            RESULT_COMMENTS.failed.MISSING_ACCREDITATION_ADDRESS(actorType),
          resultStatus: 'FAILED',
        },
      ];
    }

    const addressDistance = this.calculateAddressDistance(
      eventAddress,
      accreditedAddress,
    );

    // Tier 1: ≤2km — pass, continue to GPS check
    if (addressDistance <= DISTANCE_THRESHOLD_PASS) {
      return this.evaluateGpsData({
        accreditedAddress,
        actorType,
        addressDistance,
        eventName,
        gpsGeolocation,
        recyclerAccreditationDocument,
      });
    }

    // Tier 3: >30km — hard fail
    if (addressDistance > DISTANCE_THRESHOLD_SIMILARITY) {
      return [
        {
          resultComment: RESULT_COMMENTS.failed.INVALID_ADDRESS_DISTANCE(
            actorType,
            addressDistance,
          ),
          resultStatus: 'FAILED',
        },
      ];
    }

    // Tier 2: 2-30km — check country/state then address similarity
    if (
      eventAddress.countryCode !== accreditedAddress.countryCode ||
      eventAddress.countryState !== accreditedAddress.countryState
    ) {
      return [
        {
          resultComment: RESULT_COMMENTS.failed.MISMATCHED_COUNTRY_OR_STATE(
            actorType,
            addressDistance,
          ),
          resultStatus: 'FAILED',
        },
      ];
    }

    const eventAddressString = this.buildAddressComparisonString(eventAddress);
    const accreditedAddressString =
      this.buildAddressComparisonString(accreditedAddress);
    const { isMatch, score } = isAddressMatch(
      eventAddressString,
      accreditedAddressString,
      ADDRESS_SIMILARITY_THRESHOLD,
    );
    const similarityPercent = Math.floor(score * 100);

    if (isMatch && score >= ADDRESS_SIMILARITY_THRESHOLD) {
      return [
        {
          resultComment:
            RESULT_COMMENTS.reviewRequired.REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY(
              actorType,
              addressDistance,
              similarityPercent,
            ),
          resultStatus: 'REVIEW_REQUIRED',
        },
      ];
    }

    return [
      {
        resultComment: RESULT_COMMENTS.failed.FAILED_ADDRESS_SIMILARITY(
          actorType,
          addressDistance,
          similarityPercent,
        ),
        resultStatus: 'FAILED',
      },
    ];
  }

  private evaluateGpsData({
    accreditedAddress,
    actorType,
    addressDistance,
    eventName,
    gpsGeolocation,
    recyclerAccreditationDocument,
  }: {
    accreditedAddress: DocumentAddress;
    actorType: MassIDDocumentActorType;
    addressDistance: number;
    eventName: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP;
    gpsGeolocation: Geolocation | undefined;
    recyclerAccreditationDocument: Document | undefined;
  }): EvaluateResultOutput[] {
    if (
      !isNil(gpsGeolocation) &&
      actorType === MassIDDocumentActorType.RECYCLER
    ) {
      const { latitudeException, longitudeException } =
        getGpsExceptionsFromRecyclerAccreditation(
          recyclerAccreditationDocument,
          eventName,
        );

      if (shouldSkipGpsValidation(latitudeException, longitudeException)) {
        return [
          {
            resultComment: RESULT_COMMENTS.passed.PASSED_WITH_GPS_EXCEPTION(
              actorType,
              addressDistance,
            ),
            resultStatus: 'PASSED',
          },
        ];
      }
    }

    if (!isNil(gpsGeolocation)) {
      const gpsDistance = this.calculateGpsDistance(
        accreditedAddress,
        gpsGeolocation,
      );

      if (gpsDistance > GPS_MAX_ALLOWED_DISTANCE) {
        return [
          {
            resultComment: RESULT_COMMENTS.failed.INVALID_GPS_DISTANCE(
              actorType,
              gpsDistance,
            ),
            resultStatus: 'FAILED',
          },
        ];
      }

      return [
        {
          resultComment: RESULT_COMMENTS.passed.PASSED_WITH_GPS(
            actorType,
            addressDistance,
            gpsDistance,
          ),
          resultStatus: 'PASSED',
        },
      ];
    }

    return [
      {
        resultComment: RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(
          actorType,
          addressDistance,
        ),
        resultStatus: 'PASSED',
      },
    ];
  }

  private evaluateResult({
    accreditationDocuments,
    massIDAuditDocument,
    participantsAddressData,
    recyclerAccreditationDocument,
  }: RuleSubject): EvaluateResultOutput {
    const actorResults = new Map<
      MassIDDocumentActorType,
      EvaluateResultOutput[]
    >();

    for (const [actorType, addressData] of participantsAddressData) {
      const results = this.evaluateAddressData(
        actorType,
        addressData,
        recyclerAccreditationDocument,
        massIDAuditDocument,
        accreditationDocuments,
      );

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

    const recyclerAccreditationDocument = documents.accreditationDocuments.find(
      (document) => {
        const relation = mapDocumentRelation(document);

        return (
          PARTICIPANT_ACCREDITATION_PARTIAL_MATCH.matches(relation) &&
          relation.subtype === DocumentSubtype.RECYCLER
        );
      },
    );

    return {
      accreditationDocuments: documents.accreditationDocuments,
      massIDAuditDocument,
      participantsAddressData: this.buildParticipantsAddressData(
        pickUpAndDropOffEvents,
        massIDDocument,
        massIDAuditDocument,
        documents.accreditationDocuments,
      ),
      recyclerAccreditationDocument,
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
