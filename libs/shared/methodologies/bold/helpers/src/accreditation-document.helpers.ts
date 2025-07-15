import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventAccreditationStatus,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type DateTime, type NonEmptyString } from '@carrot-fndn/shared/types';
import { isAfter, isBefore, isToday } from 'date-fns';
import { is } from 'typia';

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
    eventNameIsAnyOf([DocumentEventName.ACCREDITATION_RESULT]),
  );

  if (!event) {
    return false;
  }

  const effectiveDate = getEventAttributeValue(
    event,
    DocumentEventAttributeName.EFFECTIVE_DATE,
  );
  const expirationDate = getEventAttributeValue(
    event,
    DocumentEventAttributeName.EXPIRATION_DATE,
  );
  const status = getEventAttributeValue(
    event,
    DocumentEventAttributeName.ACCREDITATION_STATUS,
  );

  if (
    !is<DateTime>(effectiveDate) ||
    !is<DateTime>(expirationDate) ||
    !is<DocumentEventAccreditationStatus>(status) ||
    status !== DocumentEventAccreditationStatus.APPROVED
  ) {
    return false;
  }

  const today = new Date();
  const effectiveDateObject = new Date(effectiveDate);
  const expirationDateObject = new Date(expirationDate);

  const isEffectiveValid =
    isToday(effectiveDateObject) || isBefore(effectiveDateObject, today);
  const isExpirationValid =
    isToday(expirationDateObject) || isAfter(expirationDateObject, today);

  return isEffectiveValid && isExpirationValid;
};
