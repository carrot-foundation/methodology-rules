import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';
import type {
  DocumentAddress,
  DocumentAddressWithCoordinates,
  Geolocation,
} from '@carrot-fndn/shared/types';

import { RuleDataProcessor } from '@carrot-fndn/shared/app/types';
import {
  calculateDistance,
  getOrUndefined,
  hasAddressCoordinates,
  isNil,
  isNonEmptyArray,
  toDocumentKey,
} from '@carrot-fndn/shared/helpers';
import { getParticipantActorType } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  ACCREDITATION_HISTORY_EVENT,
  type AccreditationEvaluationContext,
  selectActorAccreditation,
} from '@carrot-fndn/shared/methodologies/bold/helpers';
import {
  collectAccreditationDocuments,
  type DocumentQuery,
  loadAccreditationDocumentQuery,
  loadDocument,
} from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  eventNameIsAnyOf,
  isActorEvent,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type BoldDocument,
  BoldDocumentEventName,
  MassIDActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { mapToRuleOutput } from '@carrot-fndn/shared/rule/result';
import {
  type RuleInput,
  type RuleOutput,
} from '@carrot-fndn/shared/rule/types';

import {
  DISTANCE_THRESHOLD_PASS,
  DISTANCE_THRESHOLD_SIMILARITY,
  GPS_MAX_ALLOWED_DISTANCE,
  RESULT_COMMENTS,
} from './geolocation-and-address-precision.constants';
import { GeolocationAndAddressPrecisionProcessorErrors } from './geolocation-and-address-precision.errors';
import {
  evaluateAddressSimilarityResult,
  getEventGpsGeolocation,
  getGpsExceptionsFromRecyclerAccreditation,
  pickGpsComment,
  shouldSkipGpsValidation,
} from './geolocation-and-address-precision.helpers';

const { DROP_OFF, PICK_UP } = BoldDocumentEventName;

export interface RuleSubject {
  accreditationDocuments: BoldDocument[];
  evaluationDate: string;
  massIDAuditDocument: BoldDocument;
  participantsAddressData: Map<string, ParticipantAddressData>;
}

interface ParticipantAddressData {
  accreditationDocument: BoldDocument | undefined;
  accreditedAddress: DocumentAddress | undefined;
  actorType: MassIDActorType;
  eventAddress: DocumentAddress;
  eventName:
    | typeof BoldDocumentEventName.DROP_OFF
    | typeof BoldDocumentEventName.PICK_UP;
  gpsGeolocation: Geolocation | undefined;
  participantId: string;
  skipOptionalValidation: boolean;
}

export class GeolocationAndAddressPrecisionProcessor extends RuleDataProcessor {
  private readonly processorErrors =
    new GeolocationAndAddressPrecisionProcessorErrors();

  async process(ruleInput: RuleInput): Promise<RuleOutput> {
    const legacyEvaluationDate = new Date().toISOString();

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

      const documentsQuery = await this.generateDocumentQuery(
        ruleInput,
        legacyEvaluationDate,
      );
      const ruleSubject = await this.getRuleSubject(
        massIDAuditDocument,
        documentsQuery,
        legacyEvaluationDate,
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

  protected async generateDocumentQuery(
    ruleInput: RuleInput,
    legacyEvaluationDate: string,
  ) {
    return loadAccreditationDocumentQuery({
      context: { s3KeyPrefix: ruleInput.documentKeyPrefix },
      documentId: ruleInput.documentId,
      legacyEvaluationDate,
    });
  }

  private aggregateResults(
    actorResults: Map<string, EvaluateResultOutput[]>,
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

  private buildParticipantsAddressData(
    events: NonNullable<BoldDocument['externalEvents']>,
    massIDDocument: BoldDocument,
    accreditationDocuments: BoldDocument[],
    evaluation: AccreditationEvaluationContext,
  ) {
    const participantsAddressData = new Map<string, ParticipantAddressData>();

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

      const canonicalFacilities = new Set(
        massIDDocument
          .externalEvents!.filter(
            (candidate) =>
              isActorEvent(candidate) &&
              candidate.label === actorType &&
              candidate.participant.id === event.participant.id,
          )
          .map((candidate) => candidate.address.id),
      );
      const selection = selectActorAccreditation({
        accreditationDocuments,
        actorScope: {
          ...(canonicalFacilities.size > 1 &&
            canonicalFacilities.has(event.address.id) && {
              facilityId: event.address.id,
            }),
          participantId: event.participant.id,
        },
        evaluation,
        massIDDocument,
        role: actorType,
      });
      let accreditationDocument: BoldDocument | undefined;
      let accreditedAddress: DocumentAddress | undefined;
      let hasHistory = false;
      let invalidSelection =
        selection.status !== 'SELECTED' &&
        !(
          selection.status === 'MISSING' &&
          actorType === MassIDActorType.WASTE_GENERATOR
        );

      if (selection.status === 'SELECTED') {
        accreditationDocument = selection.document;
        const selectedEvents = selection.document.externalEvents ?? [];
        const facilityEvents = selectedEvents.filter(
          (candidate) =>
            candidate.name === BoldDocumentEventName.FACILITY_ADDRESS,
        );

        accreditedAddress =
          facilityEvents.length === 1 ? facilityEvents[0]!.address : undefined;
        hasHistory = selectedEvents.some(
          (candidate) => candidate.name === ACCREDITATION_HISTORY_EVENT,
        );
        invalidSelection =
          hasHistory &&
          (accreditedAddress === undefined ||
            accreditedAddress.id !== selection.document.primaryAddress.id ||
            accreditedAddress.participantId !== event.participant.id);
      }

      if (invalidSelection) {
        throw this.processorErrors.getKnownError(
          RESULT_COMMENTS.failed.MISSING_ACCREDITATION_ADDRESS(actorType),
        );
      }

      participantsAddressData.set(event.id, {
        accreditationDocument,
        accreditedAddress,
        actorType,
        eventAddress: event.address,
        eventName: event.name as
          | typeof BoldDocumentEventName.DROP_OFF
          | typeof BoldDocumentEventName.PICK_UP,
        gpsGeolocation: getEventGpsGeolocation(event),
        participantId: event.participant.id,
        skipOptionalValidation:
          actorType === MassIDActorType.WASTE_GENERATOR &&
          !hasHistory &&
          accreditedAddress === undefined,
      });
    }

    return participantsAddressData;
  }

  private async collectDocuments(
    documentQuery: DocumentQuery<BoldDocument> | undefined,
    legacyEvaluationDate: string,
  ) {
    const { accreditationDocuments, evaluation, massIDDocument } =
      await collectAccreditationDocuments(documentQuery, legacyEvaluationDate);

    if (!isNonEmptyArray(accreditationDocuments)) {
      throw this.processorErrors.getKnownError(
        this.processorErrors.ERROR_MESSAGE
          .PARTICIPANT_ACCREDITATION_DOCUMENTS_NOT_FOUND,
      );
    }

    return { accreditationDocuments, evaluation, massIDDocument };
  }

  private evaluateAddressData(
    actorType: MassIDActorType,
    addressData: ParticipantAddressData,
    recyclerAccreditationDocument: BoldDocument | undefined,
    evaluationDate: string,
  ): EvaluateResultOutput[] {
    const { accreditedAddress, eventAddress, eventName, gpsGeolocation } =
      addressData;

    if (addressData.skipOptionalValidation) {
      return [
        {
          resultComment:
            RESULT_COMMENTS.passed.OPTIONAL_VALIDATION_SKIPPED(actorType),
          resultStatus: 'PASSED',
        },
      ];
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
        evaluationDate,
        eventAddress,
        eventName,
        gpsGeolocation,
        recyclerAccreditationDocument,
      });
    }

    return this.evaluateAddressDataWithCoordinates({
      accreditedAddress,
      actorType,
      evaluationDate,
      eventAddress,
      eventName,
      gpsGeolocation,
      recyclerAccreditationDocument,
    });
  }

  private evaluateAddressDataWithCoordinates({
    accreditedAddress,
    actorType,
    evaluationDate,
    eventAddress,
    eventName,
    gpsGeolocation,
    recyclerAccreditationDocument,
  }: {
    accreditedAddress: DocumentAddressWithCoordinates;
    actorType: MassIDActorType;
    evaluationDate: string;
    eventAddress: DocumentAddressWithCoordinates;
    eventName:
      | typeof BoldDocumentEventName.DROP_OFF
      | typeof BoldDocumentEventName.PICK_UP;
    gpsGeolocation: Geolocation | undefined;
    recyclerAccreditationDocument: BoldDocument | undefined;
  }): EvaluateResultOutput[] {
    const addressDistance = calculateDistance(eventAddress, accreditedAddress);

    // Tier 1: ≤2km — pass, continue to GPS check
    if (addressDistance <= DISTANCE_THRESHOLD_PASS) {
      return this.evaluateGpsData({
        accreditedAddress,
        actorType,
        addressDistance,
        evaluationDate,
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

    return [
      evaluateAddressSimilarityResult(eventAddress, accreditedAddress, {
        failed: (similarityPercent) =>
          RESULT_COMMENTS.failed.FAILED_ADDRESS_SIMILARITY(
            actorType,
            addressDistance,
            similarityPercent,
          ),
        passed: (similarityPercent) =>
          RESULT_COMMENTS.passed.PASSED_WITH_ADDRESS_SIMILARITY(
            actorType,
            addressDistance,
            similarityPercent,
          ),
        reviewRequired: (similarityPercent) =>
          RESULT_COMMENTS.reviewRequired.REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY(
            actorType,
            addressDistance,
            similarityPercent,
          ),
      }),
    ];
  }

  private evaluateGpsData({
    accreditedAddress,
    actorType,
    addressDistance,
    evaluationDate,
    eventName,
    gpsGeolocation,
    recyclerAccreditationDocument,
  }: {
    accreditedAddress: DocumentAddressWithCoordinates;
    actorType: MassIDActorType;
    addressDistance: number | undefined;
    evaluationDate: string;
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

      if (
        shouldSkipGpsValidation(
          latitudeException,
          longitudeException,
          evaluationDate,
        )
      ) {
        return this.gpsResult(
          addressDistance,
          'PASSED',
          () =>
            RESULT_COMMENTS.passed.PASSED_WITH_GPS_EXCEPTION_NO_EVENT_COORDINATES(
              actorType,
            ),
          (distance) =>
            RESULT_COMMENTS.passed.PASSED_WITH_GPS_EXCEPTION(
              actorType,
              distance,
            ),
        );
      }
    }

    if (!isNil(gpsGeolocation)) {
      const gpsDistance = calculateDistance(accreditedAddress, gpsGeolocation);

      if (gpsDistance > GPS_MAX_ALLOWED_DISTANCE) {
        return this.gpsResult(
          addressDistance,
          'FAILED',
          () =>
            RESULT_COMMENTS.failed.INVALID_GPS_DISTANCE_NO_EVENT_COORDINATES(
              actorType,
              gpsDistance,
            ),
          () =>
            RESULT_COMMENTS.failed.INVALID_GPS_DISTANCE(actorType, gpsDistance),
        );
      }

      return this.gpsResult(
        addressDistance,
        'PASSED',
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
      );
    }

    return this.gpsResult(
      addressDistance,
      'PASSED',
      () =>
        RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS_NO_EVENT_COORDINATES(
          actorType,
        ),
      (distance) =>
        RESULT_COMMENTS.passed.PASSED_WITHOUT_GPS(actorType, distance),
    );
  }

  private evaluateResult({
    evaluationDate,
    participantsAddressData,
  }: RuleSubject): EvaluateResultOutput {
    const actorResults = new Map<string, EvaluateResultOutput[]>();

    for (const [eventId, addressData] of participantsAddressData) {
      const results = this.evaluateAddressData(
        addressData.actorType,
        addressData,
        addressData.accreditationDocument,
        evaluationDate,
      );

      actorResults.set(eventId, results);
    }

    return this.aggregateResults(actorResults);
  }

  private evaluateTextualAddressWithoutCoordinates(
    actorType: MassIDActorType,
    eventAddress: DocumentAddress,
    accreditedAddress: DocumentAddressWithCoordinates,
  ): EvaluateResultOutput {
    if (
      eventAddress.countryCode !== accreditedAddress.countryCode ||
      eventAddress.countryState !== accreditedAddress.countryState
    ) {
      return {
        resultComment:
          RESULT_COMMENTS.failed.MISMATCHED_COUNTRY_OR_STATE_NO_EVENT_COORDINATES(
            actorType,
          ),
        resultStatus: 'FAILED',
      };
    }

    return evaluateAddressSimilarityResult(eventAddress, accreditedAddress, {
      failed: (similarityPercent) =>
        RESULT_COMMENTS.failed.FAILED_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES(
          actorType,
          similarityPercent,
        ),
      passed: (similarityPercent) =>
        RESULT_COMMENTS.passed.PASSED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES(
          actorType,
          similarityPercent,
        ),
      reviewRequired: (similarityPercent) =>
        RESULT_COMMENTS.reviewRequired.REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES(
          actorType,
          similarityPercent,
        ),
    });
  }

  private evaluateWithoutEventCoordinates({
    accreditedAddress,
    actorType,
    evaluationDate,
    eventAddress,
    eventName,
    gpsGeolocation,
    recyclerAccreditationDocument,
  }: {
    accreditedAddress: DocumentAddressWithCoordinates;
    actorType: MassIDActorType;
    evaluationDate: string;
    eventAddress: DocumentAddress;
    eventName:
      | typeof BoldDocumentEventName.DROP_OFF
      | typeof BoldDocumentEventName.PICK_UP;
    gpsGeolocation: Geolocation | undefined;
    recyclerAccreditationDocument: BoldDocument | undefined;
  }): EvaluateResultOutput[] {
    const textualResult = this.evaluateTextualAddressWithoutCoordinates(
      actorType,
      eventAddress,
      accreditedAddress,
    );

    const gpsResults = this.evaluateGpsData({
      accreditedAddress,
      actorType,
      addressDistance: undefined,
      evaluationDate,
      eventName,
      gpsGeolocation,
      recyclerAccreditationDocument,
    });

    return [textualResult, ...gpsResults];
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
    legacyEvaluationDate: string,
  ): Promise<RuleSubject> {
    const documents = await this.collectDocuments(
      documentQuery,
      legacyEvaluationDate,
    );
    const massIDDocument = this.validateMassIDDocument(
      documents.massIDDocument,
    );
    const pickUpAndDropOffEvents = this.extractRequiredEvents(massIDDocument);

    return {
      accreditationDocuments: documents.accreditationDocuments,
      evaluationDate: documents.evaluation.evaluationDate,
      massIDAuditDocument,
      participantsAddressData: this.buildParticipantsAddressData(
        pickUpAndDropOffEvents,
        massIDDocument,
        documents.accreditationDocuments,
        documents.evaluation,
      ),
    };
  }

  private gpsResult(
    addressDistance: number | undefined,
    resultStatus: EvaluateResultOutput['resultStatus'],
    noCoord: () => string,
    withCoord: (distance: number) => string,
  ): EvaluateResultOutput[] {
    return [
      {
        resultComment: pickGpsComment(addressDistance, noCoord, withCoord),
        resultStatus,
      },
    ];
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
