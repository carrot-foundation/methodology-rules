import type { ApprovedException } from '@carrot-fndn/shared/types';

import {
  ApprovedExceptionType,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

export interface GpsLatitudeApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: DocumentCategory.MASS_ID;
    };
    Event: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP;
  };
  'Attribute Name': DocumentEventAttributeName.CAPTURED_GPS_LATITUDE;
  'Exception Type': (typeof ApprovedExceptionType)['MANDATORY_ATTRIBUTE'];
  Reason: string;
}

export interface GpsLongitudeApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: DocumentCategory.MASS_ID;
    };
    Event: DocumentEventName.DROP_OFF | DocumentEventName.PICK_UP;
  };
  'Attribute Name': DocumentEventAttributeName.CAPTURED_GPS_LONGITUDE;
  'Exception Type': (typeof ApprovedExceptionType)['MANDATORY_ATTRIBUTE'];
  Reason: string;
}
