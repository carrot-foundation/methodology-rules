import type {
  NonEmptyArray,
  NonEmptyString,
  NonZeroPositive,
  Uri,
  Url,
} from '@carrot-fndn/shared/types';

import type { RewardsDistributionParticipant } from './nft-metadata-selection.dto';

interface NftMetadataAttributes {
  trait_type: NonEmptyString;
  value: NonEmptyString;
}

interface NftMetadataMassId {
  external_id: NonEmptyString;
  external_url: Url;
  recycler: NonEmptyString;
  weight: NonEmptyString;
}

export interface NftMetadataCertificate {
  external_id: NonEmptyString;
  external_url: Url;
  mass_id_count: NonZeroPositive;
  mass_ids: NonEmptyArray<NftMetadataMassId>;
}

export interface NftMetadataCertificates {
  count: NonZeroPositive;
  description: NonEmptyString;
  documents: NonEmptyArray<NftMetadataCertificate>;
}

export interface NftMetadataMethodology {
  description: NonEmptyString;
  external_url: Url;
  name: NonEmptyString;
  pdf: Uri;
}

interface NftMetadataSummary {
  certificate_label: NonEmptyString;
  certificates_count: NonZeroPositive;
  mass_ids_count: NonZeroPositive;
  mass_ids_total_weight: NonEmptyString;
  mass_subtype: NonEmptyString;
  mass_type: NonEmptyString;
  origin_country: NonEmptyString;
  origin_state: NonEmptyString;
  recycler_name: NonEmptyString;
}

export interface NftMetadataRewardsDistribution {
  description: NonEmptyString;
  external_url: Url;
  participants: NonEmptyArray<RewardsDistributionParticipant>;
  policy_version: NonEmptyString;
}

interface NftMetadataDetails {
  certificates: NftMetadataCertificates;
  methodology: NftMetadataMethodology;
  rewards_distribution: NftMetadataRewardsDistribution;
  summary: NftMetadataSummary;
}

export interface NftMetadata {
  attributes: NonEmptyArray<NftMetadataAttributes>;
  description: NonEmptyString;
  details: NftMetadataDetails;
  external_id: NonEmptyString;
  external_url: Url;
  image: Uri;
  name: NonEmptyString;
}
