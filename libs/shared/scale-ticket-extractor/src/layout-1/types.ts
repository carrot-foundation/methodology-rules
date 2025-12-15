import type { NonEmptyString } from '@carrot-fndn/shared/types';

import type { ScaleTicketData } from '../types';

export interface Layout1ScaleTicketData extends ScaleTicketData {
  transporter:
    | undefined
    | {
        code: NonEmptyString;
        name: NonEmptyString;
      };
  vehiclePlate: NonEmptyString | undefined;
}
