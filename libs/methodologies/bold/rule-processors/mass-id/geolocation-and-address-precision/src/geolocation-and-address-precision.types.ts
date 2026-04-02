import type { ApprovedException } from '@carrot-fndn/shared/types';

import {
  BoldApprovedExceptionType,
  BoldAttributeName,
  BoldDocumentCategory,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

export interface GpsLatitudeApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: typeof BoldDocumentCategory.MASS_ID;
    };
    Event:
      | typeof BoldDocumentEventName.DROP_OFF
      | typeof BoldDocumentEventName.PICK_UP;
  };
  'Attribute Name': typeof BoldAttributeName.CAPTURED_GPS_LATITUDE;
  'Exception Type': (typeof BoldApprovedExceptionType)['MANDATORY_ATTRIBUTE'];
  Reason: string;
}

export interface GpsLongitudeApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: typeof BoldDocumentCategory.MASS_ID;
    };
    Event:
      | typeof BoldDocumentEventName.DROP_OFF
      | typeof BoldDocumentEventName.PICK_UP;
  };
  'Attribute Name': typeof BoldAttributeName.CAPTURED_GPS_LONGITUDE;
  'Exception Type': (typeof BoldApprovedExceptionType)['MANDATORY_ATTRIBUTE'];
  Reason: string;
}
