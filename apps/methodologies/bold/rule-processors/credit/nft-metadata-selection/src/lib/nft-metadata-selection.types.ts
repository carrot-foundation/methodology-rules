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

export interface NftMetadataMassCertificate {
  external_id: NonEmptyString;
  external_url: Url;
  mass_id_count: NonZeroPositive;
  mass_ids: NonEmptyArray<NftMetadataMassId>;
}

export interface NftMetadataMassCertificates {
  count: NonZeroPositive;
  description: NonEmptyString;
  documents: NonEmptyArray<NftMetadataMassCertificate>;
}

export interface NftMetadataMethodology {
  description: NonEmptyString;
  external_url: Url;
  name: NonEmptyString;
  pdf: Uri;
}

interface NftMetadataSummary {
  mass_certificate_count: NonZeroPositive;
  mass_id_count: NonZeroPositive;
  mass_origin_country: NonEmptyString;
  mass_origin_state: NonEmptyString;
  mass_subtype: NonEmptyString;
  mass_total_weight: NonEmptyString;
  mass_type: NonEmptyString;
  recycler_name: NonEmptyString;
}

export interface NftMetadataRewardsDistribution {
  description: NonEmptyString;
  external_url: Url;
  participants: NonEmptyArray<RewardsDistributionParticipant>;
  policy_version: NonEmptyString;
}

interface NftMetadataDetails {
  massCertificates: NftMetadataMassCertificates;
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
