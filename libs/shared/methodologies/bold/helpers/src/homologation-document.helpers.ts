import { isNil } from '@carrot-fndn/shared/helpers';
import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventAttributeName,
  DocumentEventName,
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
    const homologationContextEvent = document.externalEvents?.find(
      eventNameIsAnyOf([DocumentEventName.HOMOLOGATION_CONTEXT]),
    );

    return (
      !isNil(homologationContextEvent) &&
      homologationContextEvent.participant.id === participantId
    );
  });

export const isHomologationActive = (document: Document): boolean => {
  const closeEvent = document.externalEvents?.find(
    eventNameIsAnyOf([DocumentEventName.CLOSE]),
  );

  if (!closeEvent) {
    return false;
  }

  const homologationDate = getEventAttributeValue(
    closeEvent,
    DocumentEventAttributeName.HOMOLOGATION_DATE,
  );
  const homologationDueDate = getEventAttributeValue(
    closeEvent,
    DocumentEventAttributeName.HOMOLOGATION_DUE_DATE,
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
