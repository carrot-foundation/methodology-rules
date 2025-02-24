import { eventHasNonEmptyStringAttribute } from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type DocumentEvent,
  DocumentEventAttributeName,
} from '@carrot-fndn/shared/methodologies/bold/types';

export const eventHasAllNonEmptyWeightAttributes = (
  event: DocumentEvent,
): boolean =>
  eventHasNonEmptyStringAttribute(
    event,
    DocumentEventAttributeName.WEIGHT_SCALE_TYPE,
  ) &&
  eventHasNonEmptyStringAttribute(
    event,
    DocumentEventAttributeName.WEIGHT_SCALE_MANUFACTURER,
  ) &&
  eventHasNonEmptyStringAttribute(
    event,
    DocumentEventAttributeName.WEIGHT_SCALE_MODEL,
  ) &&
  eventHasNonEmptyStringAttribute(
    event,
    DocumentEventAttributeName.WEIGHT_SCALE_SOFTWARE,
  ) &&
  eventHasNonEmptyStringAttribute(
    event,
    DocumentEventAttributeName.WEIGHT_SCALE_SUPPLIER,
  );
