export const ADDRESS_SIMILARITY_THRESHOLD = 0.75;
export const DISTANCE_THRESHOLD_PASS = 2000;
export const DISTANCE_THRESHOLD_SIMILARITY = 30_000;
export const GPS_MAX_ALLOWED_DISTANCE = 2000;

const compliantAddress = (actorType: string): string =>
  `Compliant ${actorType} address`;

const nonCompliantAddress = (actorType: string): string =>
  `Non-compliant ${actorType} address`;

const eventToAccreditedDistance = (addressDistance: number): string =>
  `the geodesic distance between the event address coordinates and the accredited facility coordinates is ${addressDistance} m`;

const NO_EVENT_COORDINATES = 'event address coordinates were not provided';

const gpsWithinAccredited = (gpsDistance: number): string =>
  `the captured GPS coordinates are within ${gpsDistance} m of the accredited facility`;

const gpsExceedingAccreditedLimit = (gpsDistance: number): string =>
  `the captured GPS coordinates are ${gpsDistance} m from the accredited facility, exceeding the ${GPS_MAX_ALLOWED_DISTANCE} m limit`;

const similarityBelowThreshold = (similarityPercent: number): string =>
  `the address data similarity is only ${similarityPercent}% (below threshold)`;

const similarityMatchesAccredited = (similarityPercent: number): string =>
  `the address data matches the accredited facility with ${similarityPercent}% similarity`;

const COUNTRY_OR_STATE_MISMATCH =
  'the event address country or state does not match the accredited facility';

const GPS_EXCEPTION_NOTE = 'GPS validation skipped due to approved exception';

const REVIEW_REQUIRED_NOTE = '(note: requires review)';

export const RESULT_COMMENTS = {
  failed: {
    FAILED_ADDRESS_SIMILARITY: (
      actorType: string,
      addressDistance: number,
      similarityPercent: number,
    ): string =>
      `${nonCompliantAddress(actorType)}: ${eventToAccreditedDistance(addressDistance)} and ${similarityBelowThreshold(similarityPercent)}.`,
    FAILED_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES: (
      actorType: string,
      similarityPercent: number,
    ): string =>
      `${nonCompliantAddress(actorType)}: ${NO_EVENT_COORDINATES}; ${similarityBelowThreshold(similarityPercent)}.`,
    INVALID_ACTOR_TYPE: 'Could not extract the event actor type.',
    INVALID_ADDRESS_DISTANCE: (
      actorType: string,
      addressDistance: number,
    ): string =>
      `${nonCompliantAddress(actorType)}: ${eventToAccreditedDistance(addressDistance)}, exceeding the ${DISTANCE_THRESHOLD_SIMILARITY} m limit.`,
    INVALID_GPS_DISTANCE: (actorType: string, gpsDistance: number): string =>
      `${nonCompliantAddress(actorType)}: ${gpsExceedingAccreditedLimit(gpsDistance)}.`,
    INVALID_GPS_DISTANCE_NO_EVENT_COORDINATES: (
      actorType: string,
      gpsDistance: number,
    ): string =>
      `${nonCompliantAddress(actorType)}: ${NO_EVENT_COORDINATES}; ${gpsExceedingAccreditedLimit(gpsDistance)}.`,
    MISMATCHED_COUNTRY_OR_STATE: (
      actorType: string,
      addressDistance: number,
    ): string =>
      `${nonCompliantAddress(actorType)}: ${eventToAccreditedDistance(addressDistance)} and ${COUNTRY_OR_STATE_MISMATCH}.`,
    MISMATCHED_COUNTRY_OR_STATE_NO_EVENT_COORDINATES: (
      actorType: string,
    ): string =>
      `${nonCompliantAddress(actorType)}: ${NO_EVENT_COORDINATES}; ${COUNTRY_OR_STATE_MISMATCH}.`,
    MISSING_ACCREDITATION_ADDRESS: (actorType: string): string =>
      `No accredited address was found for the ${actorType} actor.`,
    MISSING_ACCREDITED_ADDRESS_COORDINATES: (actorType: string): string =>
      `Non-compliant ${actorType} accreditation: the accredited facility address is missing latitude or longitude coordinates required for distance validation.`,
  },
  passed: {
    OPTIONAL_VALIDATION_SKIPPED: (actorType: string): string =>
      `Optional validation skipped for ${actorType} (verification document not found).`,
    PASSED_WITH_ADDRESS_SIMILARITY: (
      actorType: string,
      addressDistance: number,
      similarityPercent: number,
    ): string =>
      `${compliantAddress(actorType)}: ${eventToAccreditedDistance(addressDistance)}, but ${similarityMatchesAccredited(similarityPercent)}.`,
    PASSED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES: (
      actorType: string,
      similarityPercent: number,
    ): string =>
      `${compliantAddress(actorType)}: ${NO_EVENT_COORDINATES}; ${similarityMatchesAccredited(similarityPercent)}.`,
    PASSED_WITH_GPS: (
      actorType: string,
      addressDistance: number,
      gpsDistance: number,
    ): string =>
      `${compliantAddress(actorType)}: ${eventToAccreditedDistance(addressDistance)}, and ${gpsWithinAccredited(gpsDistance)}.`,
    PASSED_WITH_GPS_EXCEPTION: (
      actorType: string,
      addressDistance: number,
    ): string =>
      `${compliantAddress(actorType)}: ${eventToAccreditedDistance(addressDistance)}. ${GPS_EXCEPTION_NOTE}.`,
    PASSED_WITH_GPS_EXCEPTION_NO_EVENT_COORDINATES: (
      actorType: string,
    ): string =>
      `${compliantAddress(actorType)}: ${NO_EVENT_COORDINATES}. ${GPS_EXCEPTION_NOTE}.`,
    PASSED_WITH_GPS_NO_EVENT_COORDINATES: (
      actorType: string,
      gpsDistance: number,
    ): string =>
      `${compliantAddress(actorType)}: ${NO_EVENT_COORDINATES}; ${gpsWithinAccredited(gpsDistance)}.`,
    PASSED_WITHOUT_GPS: (actorType: string, addressDistance: number): string =>
      `${compliantAddress(actorType)}: ${eventToAccreditedDistance(addressDistance)} (note: no GPS data was provided).`,
    PASSED_WITHOUT_GPS_NO_EVENT_COORDINATES: (actorType: string): string =>
      `${compliantAddress(actorType)}: ${NO_EVENT_COORDINATES} and no GPS data was supplied; validation relied on textual address comparison only.`,
  },
  reviewRequired: {
    REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY: (
      actorType: string,
      addressDistance: number,
      similarityPercent: number,
    ): string =>
      `${compliantAddress(actorType)}: ${eventToAccreditedDistance(addressDistance)}, but ${similarityMatchesAccredited(similarityPercent)} ${REVIEW_REQUIRED_NOTE}.`,
    REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES: (
      actorType: string,
      similarityPercent: number,
    ): string =>
      `${compliantAddress(actorType)}: ${NO_EVENT_COORDINATES}; ${similarityMatchesAccredited(similarityPercent)} ${REVIEW_REQUIRED_NOTE}.`,
  },
} as const;
