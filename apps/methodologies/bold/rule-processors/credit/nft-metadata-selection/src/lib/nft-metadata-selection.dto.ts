import type { CertificateReward } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import type {
  NonEmptyArray,
  NonEmptyString,
  Uri,
  Url,
} from '@carrot-fndn/shared/types';
import type { tags } from 'typia';

export interface MassMetadata {
  documentId: NonEmptyString;
  measurementUnit: NonEmptyString;
  originCity: NonEmptyString;
  originCountry: NonEmptyString;
  originCountryState: NonEmptyString;
  recyclerName: NonEmptyString;
  subtype: NonEmptyString;
  type: NonEmptyString;
  value: number & tags.ExclusiveMinimum<0> & tags.Type<'float'>;
}

export interface MassCertificateMetadata {
  documentId: NonEmptyString;
  masses: NonEmptyArray<MassMetadata>;
}

export interface MethodologyMetadata {
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

export interface MethodologyCreditNftMetadataDto {
  collectionName: NonEmptyString;
  creditDocumentId: NonEmptyString;
  image?: Uri | undefined;
  massCertificates: NonEmptyArray<MassCertificateMetadata>;
  methodology: MethodologyMetadata;
  nftDescription: NonEmptyString;
  rewardsDistribution: RewardsDistributionMetadata;
  storeContractAddress: NonEmptyString;
}
