import type { ParticipantType } from './enum.types';

export interface Participant {
  countryCode: string;
  id: string;
  name: string;
  piiSnapshotId: string;
  type: ParticipantType | string;
}

export interface Author {
  clientId: string;
  environment: string;
  participantId: string;
}
