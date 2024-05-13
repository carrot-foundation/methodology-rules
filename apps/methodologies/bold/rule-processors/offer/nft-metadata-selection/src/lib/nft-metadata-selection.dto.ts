import type { CertificateReward } from '@carrot-fndn/methodologies/bold/types';
import type {
  NonEmptyArray,
  NonEmptyString,
  Url,
} from '@carrot-fndn/shared/types';
import type { tags } from 'typia';

export interface MassMetadata {
  documentId: NonEmptyString;
  measurementUnit: NonEmptyString;
  originCountry: NonEmptyString;
  originCountryState: NonEmptyString;
  recyclerName: NonEmptyString;
  subtype: NonEmptyString;
  type: NonEmptyString;
  value: number & tags.ExclusiveMinimum<0> & tags.Type<'float'>;
}

export interface CertificateMetadata {
  documentId: NonEmptyString;
  masses: NonEmptyArray<MassMetadata>;
}

export interface MethodologyMetadata {
  certificateValueLabel: NonEmptyString;
  description: NonEmptyString;
  documentId: NonEmptyString;
  name: NonEmptyString;
}

export interface RewardsDistributionParticipant {
  id: CertificateReward['participant']['id'];
  share: CertificateReward['percentage'];
  type: CertificateReward['actorType'];
}

export interface RewardsDistributionMetadata {
  externalUrl: Url;
  participants: NonEmptyArray<RewardsDistributionParticipant>;
  policyVersion: NonEmptyString;
}

export interface MethodologyOfferNftMetadataDto {
  certificates: NonEmptyArray<CertificateMetadata>;
  methodology: MethodologyMetadata;
  offerDocumentId: NonEmptyString;
  rewardsDistribution: RewardsDistributionMetadata;
}
