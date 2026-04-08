import type {
  DocumentAddress,
  DocumentAddressWithCoordinates,
} from '@carrot-fndn/shared/types';

import { isNil } from './common.helpers';

export const hasAddressCoordinates = (
  address: DocumentAddress,
): address is DocumentAddressWithCoordinates =>
  !isNil(address.latitude) && !isNil(address.longitude);
