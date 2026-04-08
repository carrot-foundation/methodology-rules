import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type {
  DocumentAddress,
  DocumentAddressWithCoordinates,
  Geolocation,
} from '@carrot-fndn/shared/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import { provideDocumentLoaderService } from '@carrot-fndn/shared/document/loader';
import { getEnableReviewRequired } from '@carrot-fndn/shared/env';
import {
  calculateDistance,
  getOrUndefined,
  hasAddressCoordinates,
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
  type BoldDocument,
  BoldDocumentEventName,
  BoldDocumentSubtype,
  MassIDActorType,
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

const { DROP_OFF, PICK_UP } = BoldDocumentEventName;

export interface RuleSubject {
  accreditationDocuments: BoldDocument[];
  massIDAuditDocument: BoldDocument;
  participantsAddressData: Map<MassIDActorType, ParticipantAddressData>;
  recyclerAccreditationDocument: BoldDocument | undefined;
}

interface ParticipantAddressData {
  accreditedAddress: DocumentAddress | undefined;
  actorType: MassIDActorType;
  eventAddress: DocumentAddress;
  eventName:
    | typeof BoldDocumentEventName.DROP_OFF
    | typeof BoldDocumentEventName.PICK_UP;
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
    actorResults: Map<MassIDActorType, EvaluateResultOutput[]>,
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
    events: NonNullable<BoldDocument['externalEvents']>,
    massIDDocument: BoldDocument,
    massIDAuditDocument: BoldDocument,
    accreditationDocuments: BoldDocument[],
  ) {
    const participantsAddressData = new Map<
      MassIDActorType,
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
          | typeof BoldDocumentEventName.DROP_OFF
          | typeof BoldDocumentEventName.PICK_UP,
        gpsGeolocation: getEventGpsGeolocation(event),
        participantId: event.participant.id,
      });
    }

    return participantsAddressData;
  }

  private calculateAddressDistance(
    eventAddress: DocumentAddressWithCoordinates,
    accreditedAddress: DocumentAddressWithCoordinates,
  ): number {
    return calculateDistance(eventAddress, accreditedAddress);
  }

  private calculateGpsDistance(
    accreditedAddress: DocumentAddressWithCoordinates,
    gpsGeolocation: Geolocation,
  ): number {
    return calculateDistance(accreditedAddress, gpsGeolocation);
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<BoldDocument> | undefined,
  ) {
    const accreditationDocuments: BoldDocument[] = [];
    let massIDDocument: BoldDocument | undefined;

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
    actorType: MassIDActorType,
    addressData: ParticipantAddressData,
    recyclerAccreditationDocument: BoldDocument | undefined,
    massIDAuditDocument: BoldDocument,
    accreditationDocuments: BoldDocument[],
  ): EvaluateResultOutput[] {
    const {
      accreditedAddress,
      eventAddress,
      eventName,
      gpsGeolocation,
      participantId,
    } = addressData;

    if (actorType === MassIDActorType.WASTE_GENERATOR) {
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

    if (!hasAddressCoordinates(accreditedAddress)) {
      return [
        {
          resultComment:
            RESULT_COMMENTS.failed.MISSING_ACCREDITED_ADDRESS_COORDINATES(
              actorType,
            ),
          resultStatus: 'FAILED',
        },
      ];
    }

    if (!hasAddressCoordinates(eventAddress)) {
      return this.evaluateWithoutEventCoordinates({
        accreditedAddress,
        actorType,
        eventAddress,
        eventName,
        gpsGeolocation,
        recyclerAccreditationDocument,
      });
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
      if (getEnableReviewRequired()) {
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
          resultComment: RESULT_COMMENTS.passed.PASSED_WITH_ADDRESS_SIMILARITY(
            actorType,
            addressDistance,
            similarityPercent,
          ),
          resultStatus: 'PASSED',
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
    accreditedAddress: DocumentAddressWithCoordinates;
    actorType: MassIDActorType;
    addressDistance: number | undefined;
    eventName:
      | typeof BoldDocumentEventName.DROP_OFF
      | typeof BoldDocumentEventName.PICK_UP;
    gpsGeolocation: Geolocation | undefined;
    recyclerAccreditationDocument: BoldDocument | undefined;
  }): EvaluateResultOutput[] {
    if (!isNil(gpsGeolocation) && actorType === MassIDActorType.RECYCLER) {
      const { latitudeException, longitudeException } =
        getGpsExceptionsFromRecyclerAccreditation(
          recyclerAccreditationDocument,
          eventName,
        );

      if (shouldSkipGpsValidation(latitudeException, longitudeException)) {
        return [
          {
            resultComment: this.pickGpsComment(
              addressDistance,
              () =>
                RESULT_COMMENTS.passed.PASSED_WITH_GPS_EXCEPTION_NO_EVENT_COORDINATES(
                  actorType,
                ),
              (distance) =>
                RESULT_COMMENTS.passed.PASSED_WITH_GPS_EXCEPTION(
                  actorType,
                  distance,
                ),
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
            resultComment: this.pickGpsComment(
              addressDistance,
              () =>
                RESULT_COMMENTS.failed.INVALID_GPS_DISTANCE_NO_EVENT_COORDINATES(
                  actorType,
                  gpsDistance,
                ),
              () =>
                RESULT_COMMENTS.failed.INVALID_GPS_DISTANCE(
                  actorType,
                  gpsDistance,
                ),
            ),
            resultStatus: 'FAILED',
          },
        ];
      }

      return [
        {
          resultComment: this.pickGpsComment(
            addressDistance,
            () =>
              RESULT_COMMENTS.passed.PASSED_WITH_GPS_NO_EVENT_COORDINATES(
                actorType,
                gpsDistance,
              ),
            (distance) =>
              RESULT_COMMENTS.passed.PASSED_WITH_GPS(
                actorType,
                distance,
                gpsDistance,
              ),
          ),
          resultStatus: 'PASSED',
        },
      ];
    }

    return [
      {
        resultComment: this.pickGpsComment(
          addressDistance,
          () =>
            RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS_NO_EVENT_COORDINATES(
              actorType,
            ),
          (distance) =>
            RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(actorType, distance),
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
    const actorResults = new Map<MassIDActorType, EvaluateResultOutput[]>();

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

  private evaluateWithoutEventCoordinates({
    accreditedAddress,
    actorType,
    eventAddress,
    eventName,
    gpsGeolocation,
    recyclerAccreditationDocument,
  }: {
    accreditedAddress: DocumentAddressWithCoordinates;
    actorType: MassIDActorType;
    eventAddress: DocumentAddress;
    eventName:
      | typeof BoldDocumentEventName.DROP_OFF
      | typeof BoldDocumentEventName.PICK_UP;
    gpsGeolocation: Geolocation | undefined;
    recyclerAccreditationDocument: BoldDocument | undefined;
  }): EvaluateResultOutput[] {
    const results: EvaluateResultOutput[] = [];

    if (
      eventAddress.countryCode !== accreditedAddress.countryCode ||
      eventAddress.countryState !== accreditedAddress.countryState
    ) {
      results.push({
        resultComment:
          RESULT_COMMENTS.failed.MISMATCHED_COUNTRY_OR_STATE_NO_EVENT_COORDINATES(
            actorType,
          ),
        resultStatus: 'FAILED',
      });
    } else {
      const eventAddressString =
        this.buildAddressComparisonString(eventAddress);
      const accreditedAddressString =
        this.buildAddressComparisonString(accreditedAddress);
      const { score } = isAddressMatch(
        eventAddressString,
        accreditedAddressString,
        ADDRESS_SIMILARITY_THRESHOLD,
      );
      const similarityPercent = Math.floor(score * 100);

      if (score >= ADDRESS_SIMILARITY_THRESHOLD) {
        if (getEnableReviewRequired()) {
          results.push({
            resultComment:
              RESULT_COMMENTS.reviewRequired.REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES(
                actorType,
                similarityPercent,
              ),
            resultStatus: 'REVIEW_REQUIRED',
          });
        } else {
          results.push({
            resultComment:
              RESULT_COMMENTS.passed.PASSED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES(
                actorType,
                similarityPercent,
              ),
            resultStatus: 'PASSED',
          });
        }
      } else {
        results.push({
          resultComment:
            RESULT_COMMENTS.failed.FAILED_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES(
              actorType,
              similarityPercent,
            ),
          resultStatus: 'FAILED',
        });
      }
    }

    results.push(
      ...this.evaluateGpsData({
        accreditedAddress,
        actorType,
        addressDistance: undefined,
        eventName,
        gpsGeolocation,
        recyclerAccreditationDocument,
      }),
    );

    return results;
  }

  private extractRequiredEvents(massIDDocument: BoldDocument) {
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
    massIDAuditDocument: BoldDocument,
    documentQuery: DocumentQuery<BoldDocument> | undefined,
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
          relation.subtype === BoldDocumentSubtype.RECYCLER
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

  private pickGpsComment(
    addressDistance: number | undefined,
    noCoord: () => string,
    withCoord: (distance: number) => string,
  ): string {
    if (isNil(addressDistance)) {
      return noCoord();
    }

    return withCoord(addressDistance);
  }

  private validateMassIDDocument(
    massIDDocument: BoldDocument | undefined,
  ): BoldDocument {
    if (isNil(massIDDocument)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE.MASS_ID_DOCUMENT_NOT_FOUND,
      );
    }

    return massIDDocument;
  }
}
