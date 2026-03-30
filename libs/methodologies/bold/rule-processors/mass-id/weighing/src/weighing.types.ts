import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  ApprovedException,
  ApprovedExceptionType,
} from '@carrot-fndn/shared/types';

export interface ContainerCapacityApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: DocumentCategory.MASS_ID;
    };
    Event: DocumentEventName.WEIGHING;
  };
  'Attribute Name': DocumentEventAttributeName.CONTAINER_CAPACITY;
  'Exception Type': ApprovedExceptionType.MANDATORY_ATTRIBUTE;
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
  'Exception Type': ApprovedExceptionType.MANDATORY_ATTRIBUTE;
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
  'Exception Type': ApprovedExceptionType.MANDATORY_ATTRIBUTE;
  Reason: string;
}
