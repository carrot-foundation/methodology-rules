import type {
  NonEmptyArray,
  NonZeroPositive,
  Uri,
  Url,
} from '@carrot-fndn/shared/types';

import type { RewardsDistributionParticipant } from './nft-metadata-selection.dto';

// TODO: Refactor to use NonEmptyString type [on-call] - https://app.clickup.com/t/3005225/CARROT-1947

interface NftMetadataAttributes {
  trait_type: string;
  value: string;
}

interface NftMetadataMassId {
  external_id: string;
  external_url: Url;
  recycler: string;
  weight: string;
}

export interface NftMetadataMassCertificate {
  external_id: string;
  external_url: Url;
  mass_id_count: NonZeroPositive;
  mass_ids: NonEmptyArray<NftMetadataMassId>;
}

export interface NftMetadataMassCertificates {
  count: NonZeroPositive;
  description: string;
  documents: NonEmptyArray<NftMetadataMassCertificate>;
}

export interface NftMetadataMethodology {
  description: string;
  external_url: Url;
  name: string;
  pdf: Uri;
}

interface NftMetadataSummary {
  mass_certificate_count: NonZeroPositive;
  mass_id_count: NonZeroPositive;
  mass_origin_city: string;
  mass_origin_country: string;
  mass_origin_state: string;
  mass_subtype: string;
  mass_total_weight: string;
  mass_type: string;
  recycler_name: string;
}

export interface NftMetadataRewardsDistribution {
  description: string;
  external_url: Url;
  participants: NonEmptyArray<RewardsDistributionParticipant>;
  policy_version: string;
}

interface NftMetadataDetails {
  massCertificates: NftMetadataMassCertificates;
  methodology: NftMetadataMethodology;
  rewards_distribution: NftMetadataRewardsDistribution;
  summary: NftMetadataSummary;
}

export interface NftMetadata {
  attributes: NonEmptyArray<NftMetadataAttributes>;
  description: string;
  details: NftMetadataDetails;
  external_id: string;
  external_url: Url;
  image: Uri;
  name: string;
  store_contract_address: string;
}
