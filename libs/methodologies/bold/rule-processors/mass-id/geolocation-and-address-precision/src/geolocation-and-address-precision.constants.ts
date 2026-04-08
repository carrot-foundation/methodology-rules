export const ADDRESS_SIMILARITY_THRESHOLD = 0.75;
export const DISTANCE_THRESHOLD_PASS = 2000;
export const DISTANCE_THRESHOLD_SIMILARITY = 30_000;
export const GPS_MAX_ALLOWED_DISTANCE = 2000;

export const RESULT_COMMENTS = {
  failed: {
    FAILED_ADDRESS_SIMILARITY: (
      actorType: string,
      addressDistance: number,
      similarityPercent: number,
    ): string =>
      `Non-compliant ${actorType} address: the geodesic distance between the event address coordinates and the accredited facility coordinates is ${addressDistance} m and the address data similarity is only ${similarityPercent}% (below threshold).`,
    FAILED_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES: (
      actorType: string,
      similarityPercent: number,
    ): string =>
      `Non-compliant ${actorType} address: event address coordinates were not provided; the address data similarity is only ${similarityPercent}% (below threshold).`,
    INVALID_ACTOR_TYPE: 'Could not extract the event actor type.',
    INVALID_ADDRESS_DISTANCE: (
      actorType: string,
      addressDistance: number,
    ): string =>
      `Non-compliant ${actorType} address: the geodesic distance between the event address coordinates and the accredited facility coordinates is ${addressDistance} m, exceeding the ${DISTANCE_THRESHOLD_SIMILARITY} m limit.`,
    INVALID_GPS_DISTANCE: (actorType: string, gpsDistance: number): string =>
      `Non-compliant ${actorType} address: the captured GPS coordinates are ${gpsDistance} m from the accredited facility, exceeding the ${GPS_MAX_ALLOWED_DISTANCE} m limit.`,
    INVALID_GPS_DISTANCE_NO_EVENT_COORDINATES: (
      actorType: string,
      gpsDistance: number,
    ): string =>
      `Non-compliant ${actorType} address: event address coordinates were not provided; the captured GPS coordinates are ${gpsDistance} m from the accredited facility, exceeding the ${GPS_MAX_ALLOWED_DISTANCE} m limit.`,
    MISMATCHED_COUNTRY_OR_STATE: (
      actorType: string,
      addressDistance: number,
    ): string =>
      `Non-compliant ${actorType} address: the geodesic distance between the event address coordinates and the accredited facility coordinates is ${addressDistance} m and the country or state do not match.`,
    MISMATCHED_COUNTRY_OR_STATE_NO_EVENT_COORDINATES: (
      actorType: string,
    ): string =>
      `Non-compliant ${actorType} address: event address coordinates were not provided; the event address country or state does not match the accredited facility.`,
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
      `Compliant ${actorType} address: the geodesic distance between the event address coordinates and the accredited facility coordinates is ${addressDistance} m, but the address data matches with ${similarityPercent}% similarity.`,
    PASSED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES: (
      actorType: string,
      similarityPercent: number,
    ): string =>
      `Compliant ${actorType} address: event address coordinates were not provided; the address data matches the accredited facility with ${similarityPercent}% similarity.`,
    PASSED_WITH_GPS: (
      actorType: string,
      addressDistance: number,
      gpsDistance: number,
    ): string =>
      `Compliant ${actorType} address: the geodesic distance between the event address coordinates and the accredited facility coordinates is ${addressDistance} m, and the captured GPS coordinates are within ${gpsDistance} m of the accredited facility.`,
    PASSED_WITH_GPS_EXCEPTION: (
      actorType: string,
      addressDistance: number,
    ): string =>
      `Compliant ${actorType} address: the geodesic distance between the event address coordinates and the accredited facility coordinates is ${addressDistance} m. GPS validation skipped due to approved exception.`,
    PASSED_WITH_GPS_EXCEPTION_NO_EVENT_COORDINATES: (
      actorType: string,
    ): string =>
      `Compliant ${actorType} address: event address coordinates were not provided. GPS validation skipped due to approved exception.`,
    PASSED_WITH_GPS_NO_EVENT_COORDINATES: (
      actorType: string,
      gpsDistance: number,
    ): string =>
      `Compliant ${actorType} address: event address coordinates were not provided; the captured GPS coordinates are within ${gpsDistance} m of the accredited facility.`,
    PASSED_WITHOUT_GPS: (actorType: string, addressDistance: number): string =>
      `Compliant ${actorType} address: the geodesic distance between the event address coordinates and the accredited facility coordinates is ${addressDistance} m (note: no GPS data was provided).`,
    PASSED_WITHOUT_GPS_NO_EVENT_COORDINATES: (actorType: string): string =>
      `Compliant ${actorType} address: event address coordinates were not provided and no GPS data was supplied; validation relied on textual address comparison only.`,
  },
  reviewRequired: {
    REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY: (
      actorType: string,
      addressDistance: number,
      similarityPercent: number,
    ): string =>
      `Compliant ${actorType} address: the geodesic distance between the event address coordinates and the accredited facility coordinates is ${addressDistance} m, but the address data matches with ${similarityPercent}% similarity (note: requires review).`,
    REVIEW_REQUIRED_WITH_ADDRESS_SIMILARITY_NO_EVENT_COORDINATES: (
      actorType: string,
      similarityPercent: number,
    ): string =>
      `Compliant ${actorType} address: event address coordinates were not provided; the address data matches the accredited facility with ${similarityPercent}% similarity (note: requires review).`,
  },
} as const;
