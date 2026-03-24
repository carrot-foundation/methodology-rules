import {
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  ApprovedException,
  MethodologyApprovedExceptionType,
} from '@carrot-fndn/shared/types';

export interface GpsLatitudeApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: typeof DocumentCategory.MassID;
    };
    Event:
      | (typeof DocumentEventName)['Drop-off']
      | (typeof DocumentEventName)['Pick-up'];
  };
  'Attribute Name': (typeof DocumentEventAttributeName)['Captured GPS Latitude'];
  'Exception Type': (typeof MethodologyApprovedExceptionType)['Exemption for Mandatory Attribute'];
  Reason: string;
}

export interface GpsLongitudeApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: typeof DocumentCategory.MassID;
    };
    Event:
      | (typeof DocumentEventName)['Drop-off']
      | (typeof DocumentEventName)['Pick-up'];
  };
  'Attribute Name': (typeof DocumentEventAttributeName)['Captured GPS Longitude'];
  'Exception Type': (typeof MethodologyApprovedExceptionType)['Exemption for Mandatory Attribute'];
  Reason: string;
}
