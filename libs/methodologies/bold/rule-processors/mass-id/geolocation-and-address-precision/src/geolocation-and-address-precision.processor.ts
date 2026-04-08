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
  buildAddressComparisonString,
  findRecyclerAccreditation,
  getAccreditedAddressByParticipantIdAndActorType,
  getEventGpsGeolocation,
  getGpsExceptionsFromRecyclerAccreditation,
  hasVerificationDocument,
  pickGpsComment,
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

type SimilarityOutcome =
  | { kind: 'fail'; similarityPercent: number }
  | { kind: 'pass'; similarityPercent: number }
  | { kind: 'review_required'; similarityPercent: number };

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
    const { accreditedAddress, eventAddress, eventName, gpsGeolocation } =
      addressData;

    if (
      this.shouldSkipWasteGeneratorValidation(
        addressData,
        massIDAuditDocument,
        accreditationDocuments,
      )
    ) {
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
        eventAddress,
        eventName,
        gpsGeolocation,
        recyclerAccreditationDocument,
      });
    }

    return this.evaluateAddressDataWithCoordinates({
      accreditedAddress,
      actorType,
      eventAddress,
      eventName,
      gpsGeolocation,
      recyclerAccreditationDocument,
    });
  }

  private evaluateAddressDataWithCoordinates({
    accreditedAddress,
    actorType,
    eventAddress,
    eventName,
    gpsGeolocation,
    recyclerAccreditationDocument,
  }: {
    accreditedAddress: DocumentAddressWithCoordinates;
    actorType: MassIDActorType;
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

    const outcome = this.evaluateAddressSimilarity(
      eventAddress,
      accreditedAddress,
    );

    switch (outcome.kind) {
      case 'fail': {
        return [
          {
            resultComment: RESULT_COMMENTS.failed.FAILED_ADDRESS_SIMILARITY(
              actorType,
              addressDistance,
              outcome.similarityPercent,
            ),
            resultStatus: 'FAILED',
          },
        ];
      }
      case 'pass': {
        return [
          {
            resultComment:
              RESULT_COMMENTS.passed.PASSED_WITH_ADDRESS_SIMILARITY(
                actorType,
                addressDistance,
                outcome.similarityPercent,
              ),
            resultStatus: 'PASSED',
          },
        ];
      }
      case 'review_required': {
        return [
          {
            resultComment:
              RESULT_COMMENTS.reviewRequired.REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY(
                actorType,
                addressDistance,
                outcome.similarityPercent,
              ),
            resultStatus: 'REVIEW_REQUIRED',
          },
        ];
      }
    }
  }

  private evaluateAddressSimilarity(
    eventAddress: DocumentAddress,
    accreditedAddress: DocumentAddress,
  ): SimilarityOutcome {
    const { isMatch, score } = isAddressMatch(
      buildAddressComparisonString(eventAddress),
      buildAddressComparisonString(accreditedAddress),
      ADDRESS_SIMILARITY_THRESHOLD,
    );
    const similarityPercent = Math.floor(score * 100);

    if (!isMatch || score < ADDRESS_SIMILARITY_THRESHOLD) {
      return { kind: 'fail', similarityPercent };
    }

    return getEnableReviewRequired()
      ? { kind: 'review_required', similarityPercent }
      : { kind: 'pass', similarityPercent };
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

    const outcome = this.evaluateAddressSimilarity(
      eventAddress,
      accreditedAddress,
    );

    switch (outcome.kind) {
      case 'fail': {
        return {
          resultComment:
            RESULT_COMMENTS.failed.FAILED_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES(
              actorType,
              outcome.similarityPercent,
            ),
          resultStatus: 'FAILED',
        };
      }
      case 'pass': {
        return {
          resultComment:
            RESULT_COMMENTS.passed.PASSED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES(
              actorType,
              outcome.similarityPercent,
            ),
          resultStatus: 'PASSED',
        };
      }
      case 'review_required': {
        return {
          resultComment:
            RESULT_COMMENTS.reviewRequired.REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES(
              actorType,
              outcome.similarityPercent,
            ),
          resultStatus: 'REVIEW_REQUIRED',
        };
      }
    }
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
    const textualResult = this.evaluateTextualAddressWithoutCoordinates(
      actorType,
      eventAddress,
      accreditedAddress,
    );

    const gpsResults = this.evaluateGpsData({
      accreditedAddress,
      actorType,
      addressDistance: undefined,
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
  ): Promise<RuleSubject> {
    const documents = await this.collectDocuments(documentQuery);
    const massIDDocument = this.validateMassIDDocument(
      documents.massIDDocument,
    );
    const pickUpAndDropOffEvents = this.extractRequiredEvents(massIDDocument);

    const recyclerAccreditationDocument = findRecyclerAccreditation(
      documents.accreditationDocuments,
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

  private shouldSkipWasteGeneratorValidation(
    addressData: ParticipantAddressData,
    massIDAuditDocument: BoldDocument,
    accreditationDocuments: BoldDocument[],
  ): boolean {
    if (addressData.actorType !== MassIDActorType.WASTE_GENERATOR) {
      return false;
    }

    const verificationDocumentExists = Boolean(
      hasVerificationDocument(
        massIDAuditDocument,
        addressData.participantId,
        addressData.actorType,
        accreditationDocuments,
      ),
    );

    return !verificationDocumentExists || isNil(addressData.accreditedAddress);
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
