import {
  DataSetName,
  MethodologyParticipantType,
} from './methodology-enum.types';

export interface MethodologyParticipant {
  countryCode: string;
  id: string;
  name: string;
  piiSnapshotId: string;
  type: MethodologyParticipantType | string;
}

export interface MethodologyAuthor {
  clientId: string;
  dataSetName: DataSetName;
  participantId: string;
}
