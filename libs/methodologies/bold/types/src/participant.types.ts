import type { DataSetName, ParticipantType } from './enum.types';

export interface Participant {
  countryCode: string;
  id: string;
  name: string;
  piiSnapshotId: string;
  type: ParticipantType | string;
}

export interface Author {
  clientId: string;
  dataSetName: DataSetName;
  participantId: string;
}
