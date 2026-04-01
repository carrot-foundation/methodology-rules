import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  BoldAccreditationStatus,
  BoldAttributeName,
  type BoldDocument,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';
import { DateTimeSchema } from '@carrot-fndn/shared/types';
import { isAfter, isBefore, isToday } from 'date-fns';

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

export const isAccreditationValid = (document: BoldDocument): boolean => {
  const event = document.externalEvents?.find(
    eventNameIsAnyOf([BoldDocumentEventName.ACCREDITATION_RESULT]),
  );

  if (!event) {
    return false;
  }

  const effectiveDate = getEventAttributeValue(
    event,
    BoldAttributeName.EFFECTIVE_DATE,
  );
  const expirationDate = getEventAttributeValue(
    event,
    BoldAttributeName.EXPIRATION_DATE,
  );
  const status = getEventAttributeValue(
    event,
    BoldAttributeName.ACCREDITATION_STATUS,
  );

  const expirationDateExists = expirationDate !== undefined;

  if (
    !DateTimeSchema.safeParse(effectiveDate).success ||
    (expirationDateExists &&
      !DateTimeSchema.safeParse(expirationDate).success) ||
    !(Object.values(BoldAccreditationStatus) as unknown[]).includes(status) ||
    status !== BoldAccreditationStatus.APPROVED
  ) {
    return false;
  }

  const today = new Date();
  const effectiveDateObject = new Date(effectiveDate as string);
  const expirationDateObject = expirationDateExists
    ? new Date(expirationDate as string)
    : new Date();

  const isEffectiveValid =
    isToday(effectiveDateObject) || isBefore(effectiveDateObject, today);
  const isExpirationValid =
    isToday(expirationDateObject) || isAfter(expirationDateObject, today);

  return isEffectiveValid && isExpirationValid;
};

export const isAccreditationValidWithOptionalDates = (
  document: BoldDocument,
): boolean => {
  const event = document.externalEvents?.find(
    eventNameIsAnyOf([BoldDocumentEventName.ACCREDITATION_RESULT]),
  );

  // If no ACCREDITATION_RESULT event exists, the accreditation is valid
  if (!event) {
    return true;
  }

  // If ACCREDITATION_RESULT exists, use the same validation as isAccreditationValid
  return isAccreditationValid(document);
};
