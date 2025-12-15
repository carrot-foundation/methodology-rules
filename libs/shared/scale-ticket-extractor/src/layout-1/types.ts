import type { ScaleTicketData } from '../types';

export interface Layout1ScaleTicketData extends ScaleTicketData {
  transporter: undefined | { code: string; name: string };
  vehiclePlate: string | undefined;
}
