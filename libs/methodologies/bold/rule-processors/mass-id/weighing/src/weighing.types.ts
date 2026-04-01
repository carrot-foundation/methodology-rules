import type { ApprovedException } from '@carrot-fndn/shared/types';

import {
  BoldApprovedExceptionType,
  BoldAttributeName,
  BoldDocumentCategory,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

export interface ContainerCapacityApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: BoldDocumentCategory.MASS_ID;
    };
    Event: BoldDocumentEventName.WEIGHING;
  };
  'Attribute Name': BoldAttributeName.CONTAINER_CAPACITY;
  'Exception Type': (typeof BoldApprovedExceptionType)['MANDATORY_ATTRIBUTE'];
  Reason: string;
}

export interface ContainerQuantityApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: BoldDocumentCategory.MASS_ID;
    };
    Event: BoldDocumentEventName.WEIGHING;
  };
  'Attribute Name': BoldAttributeName.CONTAINER_QUANTITY;
  'Exception Type': (typeof BoldApprovedExceptionType)['MANDATORY_ATTRIBUTE'];
  Reason: string;
}

export interface TareApprovedException extends ApprovedException {
  'Attribute Location': {
    Asset: {
      Category: BoldDocumentCategory.MASS_ID;
    };
    Event: BoldDocumentEventName.WEIGHING;
  };
  'Attribute Name': BoldAttributeName.TARE;
  'Exception Type': (typeof BoldApprovedExceptionType)['MANDATORY_ATTRIBUTE'];
  Reason: string;
}
