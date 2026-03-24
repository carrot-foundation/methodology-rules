import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventAccreditationStatusSchema,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';
import { DateTimeSchema } from '@carrot-fndn/shared/types';
import { isAfter, isBefore, isToday } from 'date-fns';

export const getParticipantAccreditationDocumentByParticipantId = ({
  accreditationDocuments,
  participantId,
}: {
  accreditationDocuments: Document[];
  participantId: NonEmptyString;
}): Document | undefined =>
  accreditationDocuments.find(
    (document) => document.primaryParticipant.id === participantId,
  );

export const isAccreditationValid = (document: Document): boolean => {
  const event = document.externalEvents?.find(
    eventNameIsAnyOf(['Accreditation Result']),
  );

  if (!event) {
    return false;
  }

  const effectiveDate = getEventAttributeValue(event, 'Effective Date');
  const expirationDate = getEventAttributeValue(event, 'Expiration Date');
  const status = getEventAttributeValue(event, 'Accreditation Status');

  const expirationDateExists = expirationDate !== undefined;

  if (
    !DateTimeSchema.safeParse(effectiveDate).success ||
    (expirationDateExists &&
      !DateTimeSchema.safeParse(expirationDate).success) ||
    !(DocumentEventAccreditationStatusSchema.options as unknown[]).includes(
      status,
    ) ||
    status !== 'Approved'
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
  document: Document,
): boolean => {
  const event = document.externalEvents?.find(
    eventNameIsAnyOf(['Accreditation Result']),
  );

  // If no ACCREDITATION_RESULT event exists, the accreditation is valid
  if (!event) {
    return true;
  }

  // If ACCREDITATION_RESULT exists, use the same validation as isAccreditationValid
  return isAccreditationValid(document);
};
