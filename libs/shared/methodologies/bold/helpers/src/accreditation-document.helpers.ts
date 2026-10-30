import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  BoldAccreditationStatus,
  BoldAttributeName,
  type BoldDocument,
  type BoldDocumentEvent,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';
import { DateTimeSchema } from '@carrot-fndn/shared/types';
import { isAfter, isSameDay } from 'date-fns';

export const getParticipantAccreditationDocumentByParticipantId = ({
  accreditationDocuments,
  participantId,
}: {
  accreditationDocuments: BoldDocument[];
  participantId: NonEmptyString;
}): BoldDocument | undefined =>
  accreditationDocuments.find(
    (document) => document.primaryParticipant.id === participantId,
  );

export const isAccreditationValid = (
  document: BoldDocument,
  evaluationDate: Date,
): boolean => {
  let selectedEvent: BoldDocumentEvent | undefined;
  let latestEffectiveTimestamp = Number.NEGATIVE_INFINITY;

  for (const event of document.externalEvents?.filter(
    eventNameIsAnyOf([BoldDocumentEventName.ACCREDITATION_RESULT]),
  ) ?? []) {
    const effectiveDate = DateTimeSchema.safeParse(
      getEventAttributeValue(event, BoldAttributeName.EFFECTIVE_DATE),
    );

    if (!effectiveDate.success) {
      continue;
    }

    const effectiveTimestamp = new Date(effectiveDate.data).getTime();

    if (
      effectiveTimestamp <= evaluationDate.getTime() &&
      effectiveTimestamp > latestEffectiveTimestamp
    ) {
      selectedEvent = event;
      latestEffectiveTimestamp = effectiveTimestamp;
    }
  }

  if (
    !selectedEvent ||
    getEventAttributeValue(
      selectedEvent,
      BoldAttributeName.ACCREDITATION_STATUS,
    ) !== BoldAccreditationStatus.APPROVED
  ) {
    return false;
  }

  const expirationDate = getEventAttributeValue(
    selectedEvent,
    BoldAttributeName.EXPIRATION_DATE,
  );

  if (expirationDate === undefined) {
    return true;
  }

  const parsedExpirationDate = DateTimeSchema.safeParse(expirationDate);

  if (!parsedExpirationDate.success) {
    return false;
  }

  const expirationDateObject = new Date(parsedExpirationDate.data);

  return (
    isSameDay(expirationDateObject, evaluationDate) ||
    isAfter(expirationDateObject, evaluationDate)
  );
};

export const isAccreditationValidWithOptionalDates = (
  document: BoldDocument,
  evaluationDate: Date,
): boolean => {
  const event = document.externalEvents?.find(
    eventNameIsAnyOf([BoldDocumentEventName.ACCREDITATION_RESULT]),
  );

  if (!event) {
    return true;
  }

  return isAccreditationValid(document, evaluationDate);
};
