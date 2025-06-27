import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventHomologationStatus,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type DateTime, type NonEmptyString } from '@carrot-fndn/shared/types';
import { isAfter, isBefore, isToday } from 'date-fns';
import { is } from 'typia';

export const getParticipantHomologationDocumentByParticipantId = ({
  homologationDocuments,
  participantId,
}: {
  homologationDocuments: Document[];
  participantId: NonEmptyString;
}): Document | undefined =>
  homologationDocuments.find((document) => {
    const event = document.externalEvents?.find(
      eventNameIsAnyOf([DocumentEventName.LEGAL_AND_ADMINISTRATIVE_COMPLIANCE]),
    );

    return event?.participant.id === participantId;
  });

export const isHomologationValid = (document: Document): boolean => {
  const event = document.externalEvents?.find(
    eventNameIsAnyOf([DocumentEventName.HOMOLOGATION_RESULT]),
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
    DocumentEventAttributeName.HOMOLOGATION_STATUS,
  );

  if (
    !is<DateTime>(effectiveDate) ||
    !is<DateTime>(expirationDate) ||
    !is<DocumentEventHomologationStatus>(status) ||
    status !== DocumentEventHomologationStatus.APPROVED
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
