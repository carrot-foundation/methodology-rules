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
      Category: typeof DocumentCategory.MassID;
    };
    Event: typeof DocumentEventName.Weighing;
  };
  'Attribute Name': (typeof DocumentEventAttributeName)['Container Capacity'];
  'Exception Type': (typeof MethodologyApprovedExceptionType)['Exemption for Mandatory Attribute'];
  Reason: string;
}

export interface ContainerQuantityApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: typeof DocumentCategory.MassID;
    };
    Event: typeof DocumentEventName.Weighing;
  };
  'Attribute Name': (typeof DocumentEventAttributeName)['Container Quantity'];
  'Exception Type': (typeof MethodologyApprovedExceptionType)['Exemption for Mandatory Attribute'];
  Reason: string;
}

export interface TareApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: typeof DocumentCategory.MassID;
    };
    Event: typeof DocumentEventName.Weighing;
  };
  'Attribute Name': typeof DocumentEventAttributeName.Tare;
  'Exception Type': (typeof MethodologyApprovedExceptionType)['Exemption for Mandatory Attribute'];
  Reason: string;
}
