import type { ApprovedException } from '@carrot-fndn/shared/types';

import {
  ApprovedExceptionType,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

export interface ContainerCapacityApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: DocumentCategory.MASS_ID;
    };
    Event: DocumentEventName.WEIGHING;
  };
  'Attribute Name': DocumentEventAttributeName.CONTAINER_CAPACITY;
  'Exception Type': (typeof ApprovedExceptionType)['MANDATORY_ATTRIBUTE'];
  Reason: string;
}

export interface ContainerQuantityApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: DocumentCategory.MASS_ID;
    };
    Event: DocumentEventName.WEIGHING;
  };
  'Attribute Name': DocumentEventAttributeName.CONTAINER_QUANTITY;
  'Exception Type': (typeof ApprovedExceptionType)['MANDATORY_ATTRIBUTE'];
  Reason: string;
}

export interface TareApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: DocumentCategory.MASS_ID;
    };
    Event: DocumentEventName.WEIGHING;
  };
  'Attribute Name': DocumentEventAttributeName.TARE;
  'Exception Type': (typeof ApprovedExceptionType)['MANDATORY_ATTRIBUTE'];
  Reason: string;
}
