import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  ApprovedException,
  MethodologyApprovedExceptionType,
} from '@carrot-fndn/shared/types';

export interface ContainerCapacityApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: DocumentCategory.MASS_ID;
    };
    Event: DocumentEventName.WEIGHING;
  };
  'Attribute Name': DocumentEventAttributeName.CONTAINER_CAPACITY;
  'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE;
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
  'Exception Type': MethodologyApprovedExceptionType.MANDATORY_ATTRIBUTE;
  Reason: string;
}
