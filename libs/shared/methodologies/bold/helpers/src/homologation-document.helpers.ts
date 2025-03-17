import { isNil } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  eventNameIsAnyOf,
  isOpenEvent,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
  NewDocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { type NonEmptyString } from '@carrot-fndn/shared/types';
import { format } from 'date-fns';
import { is } from 'typia';

export const getParticipantHomologationDocumentByParticipantId = ({
  homologationDocuments,
  participantId,
}: {
  homologationDocuments: Document[];
  participantId: NonEmptyString;
}): Document | undefined =>
  homologationDocuments.find((document) => {
    const openEvent = document.externalEvents?.find(isOpenEvent);

    return !isNil(openEvent) && openEvent.participant.id === participantId;
  });

export const isHomologationActive = (
  document: Document,
  useNewAttributes = true,
): boolean => {
  const closeEvent = document.externalEvents?.find(
    eventNameIsAnyOf([DocumentEventName.CLOSE]),
  );

  if (!closeEvent) {
    return false;
  }

  const attributeNames = useNewAttributes
    ? {
        homologationDate: NewDocumentEventAttributeName.HOMOLOGATION_DATE,
        homologationDueDate:
          NewDocumentEventAttributeName.HOMOLOGATION_DUE_DATE,
      }
    : {
        homologationDate: DocumentEventAttributeName.HOMOLOGATION_DATE,
        homologationDueDate: DocumentEventAttributeName.HOMOLOGATION_DUE_DATE,
      };

  const homologationDate = getEventAttributeValue(
    closeEvent,
    attributeNames.homologationDate,
  );
  const homologationDueDate = getEventAttributeValue(
    closeEvent,
    attributeNames.homologationDueDate,
  );

  if (
    !is<NonEmptyString>(homologationDate) ||
    !is<NonEmptyString>(homologationDueDate)
  ) {
    return false;
  }

  const todayString = format(new Date(), 'yyyy-MM-dd');

  return homologationDate <= todayString && homologationDueDate >= todayString;
};
