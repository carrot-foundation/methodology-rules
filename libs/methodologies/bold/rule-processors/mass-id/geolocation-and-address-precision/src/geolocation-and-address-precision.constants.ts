export const MAX_ALLOWED_DISTANCE = 2000;

export const RESULT_COMMENTS = {
  failed: {
    INVALID_ACTOR_TYPE: 'Could not extract the event actor type.',
    INVALID_ADDRESS_DISTANCE: (
      actorType: string,
      addressDistance: number,
    ): string =>
      `Non-compliant ${actorType} address: the event address is ${addressDistance} m away from the accredited address, exceeding the ${MAX_ALLOWED_DISTANCE} m limit.`,
    INVALID_GPS_DISTANCE: (actorType: string, gpsDistance: number): string =>
      `Non-compliant ${actorType} address: the captured GPS location is ${gpsDistance} m away from the accredited address, exceeding the ${MAX_ALLOWED_DISTANCE} m limit.`,
    MISSING_ACCREDITATION_ADDRESS: (actorType: string): string =>
      `No accredited address was found for the ${actorType} actor.`,
  },
  passed: {
    OPTIONAL_VALIDATION_SKIPPED: (actorType: string): string =>
      `Optional validation skipped for ${actorType} (verification document not found).`,
    PASSED_WITH_GPS: (
      actorType: string,
      addressDistance: number,
      gpsDistance: number,
    ): string =>
      `Compliant ${actorType} address: the event address is within ${MAX_ALLOWED_DISTANCE} m of the accredited address (${addressDistance} m), and the GPS location is within ${MAX_ALLOWED_DISTANCE} m of the event address (${gpsDistance} m).`,
    PASSED_WITH_GPS_EXCEPTION: (
      actorType: string,
      addressDistance: number,
    ): string =>
      `Compliant ${actorType} address: the event address is within ${MAX_ALLOWED_DISTANCE} m of the accredited address (${addressDistance} m). GPS validation skipped due to approved exception.`,
    PASSED_WITHOUT_GPS: (actorType: string, addressDistance: number): string =>
      `Compliant ${actorType} address: the event address is within ${MAX_ALLOWED_DISTANCE} m of the accredited address (${addressDistance} m) (note: no GPS data was provided).`,
  },
  reviewRequired: {},
} as const;
