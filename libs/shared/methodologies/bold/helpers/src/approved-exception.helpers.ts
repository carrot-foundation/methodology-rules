import { getEventAttributeValue } from '@carrot-fndn/shared/methodologies/bold/getters';
import { eventNameIsAnyOf } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  BoldAttributeName,
  type BoldDocument,
  type BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type ApprovedException,
  isApprovedExceptionAttributeValue,
} from '@carrot-fndn/shared/types';
import { isAfter, isValid, parseISO } from 'date-fns';

const { APPROVED_EXCEPTIONS } = BoldAttributeName;

export const getApprovedExceptions = (
  accreditationDocument: BoldDocument,
  eventName: BoldDocumentEventName,
): ApprovedException[] | undefined => {
  const event = accreditationDocument.externalEvents?.find(
    eventNameIsAnyOf([eventName]),
  );

  if (!event) {
    return undefined;
  }

  const approvedExceptions = getEventAttributeValue(event, APPROVED_EXCEPTIONS);

  if (!isApprovedExceptionAttributeValue(approvedExceptions)) {
    return undefined;
  }

  return approvedExceptions;
};

export const isApprovedExceptionValid = (
  exception: ApprovedException | undefined,
): boolean => {
  if (!exception) {
    return false;
  }

  const validUntil = exception['Valid Until'];

  if (!validUntil) {
    return true;
  }

  const validUntilDate = parseISO(validUntil);

  if (!isValid(validUntilDate)) {
    return false;
  }

  return !isAfter(new Date(), validUntilDate);
};
