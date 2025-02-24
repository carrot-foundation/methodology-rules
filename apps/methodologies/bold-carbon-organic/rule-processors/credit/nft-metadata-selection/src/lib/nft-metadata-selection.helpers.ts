import type { RuleInput } from '@carrot-fndn/shared/rule/types';
import type {
  NonEmptyArray,
  NonEmptyString,
  Uri,
} from '@carrot-fndn/shared/types';

import { isNil, isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import {
  getEventAttributeValue,
  getEventAttributeValueOrThrow,
  getRulesMetadataEvent,
} from '@carrot-fndn/shared/methodologies/bold/getters';
import {
  MASS_AUDIT,
  MASS_CERTIFICATE,
} from '@carrot-fndn/shared/methodologies/bold/matchers';
import {
  and,
  eventHasName,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/shared/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventRuleSlug,
  type DocumentReference,
  type RewardDistributionResultContent,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { validateNonEmptyString } from '@carrot-fndn/shared/methodologies/bold/utils';
import { is } from 'typia';

import type {
  MassCertificateMetadata,
  MassMetadata,
  MethodologyCreditNftMetadataDto,
  MethodologyMetadata,
  RewardsDistributionMetadata,
  RewardsDistributionParticipant,
} from './nft-metadata-selection.dto';
import type { DocumentLinks } from './nft-metadata-selection.processor';
import type {
  NftMetadata,
  NftMetadataMassCertificate,
} from './nft-metadata-selection.types';

import { assertMethodologyCreditNftMetadataDto } from './nft-metadata-selection.helpers.typia';

const { RECYCLER } = DocumentEventActorType;
const { ACTOR, OPEN, RULE_EXECUTION } = DocumentEventName;
const {
  ACTOR_TYPE,
  COLLECTION_NAME,
  NFT_DESCRIPTION,
  NFT_IMAGE,
  STORE_CONTRACT_ADDRESS,
} = DocumentEventAttributeName;
const { REWARDS_DISTRIBUTION } = DocumentEventRuleSlug;

const logger = console;

export const getCarrotExplorePageUrl = (documentId: string) =>
  `https://explore.carrot.eco/document/${documentId}`;

export const getRulesMetadataEventValues = (
  document: Document | undefined,
): {
  collectionName: NonEmptyString;
  image: Uri | undefined;
  nftDescription: NonEmptyString;
  storeContractAddress: NonEmptyString;
} => {
  const rulesMetadataEvent = getRulesMetadataEvent(document);

  if (!rulesMetadataEvent) {
    throw new Error('Rules metadata event not found');
  }

  const uri = getEventAttributeValue(rulesMetadataEvent, NFT_IMAGE);
  const collectionName = getEventAttributeValueOrThrow(
    rulesMetadataEvent,
    COLLECTION_NAME,
    validateNonEmptyString,
  );
  const nftDescription = getEventAttributeValueOrThrow(
    rulesMetadataEvent,
    NFT_DESCRIPTION,
    validateNonEmptyString,
  );
  const storeContractAddress = getEventAttributeValueOrThrow(
    rulesMetadataEvent,
    STORE_CONTRACT_ADDRESS,
    validateNonEmptyString,
  );

  return {
    collectionName,
    image: is<Uri>(uri) ? uri : undefined,
    nftDescription,
    storeContractAddress,
  };
};

export const mapMassMetadata = (document: Document): MassMetadata => ({
  documentId: document.id,
  measurementUnit: document.measurementUnit,
  originCity: document.primaryAddress.city,
  originCountry: document.primaryAddress.countryCode,
  originCountryState: document.primaryAddress.countryState,
  recyclerName: document.externalEvents?.find(
    and(
      eventNameIsAnyOf([ACTOR]),
      metadataAttributeValueIsAnyOf(ACTOR_TYPE, [RECYCLER]),
    ),
  )?.participant.name as NonEmptyString,
  subtype: document.subtype as NonEmptyString,
  type: document.type as NonEmptyString,
  value: document.currentValue,
});

export const getMassValue = (mass: MassMetadata): number => mass.value;

export const formatWeight = (weight: number, fractionDigits = 2): string =>
  `${Intl.NumberFormat('en-US', {
    maximumFractionDigits: fractionDigits,
  }).format(weight)}kg`;

export const findMassAuditId = (
  massDocument: Document,
  documentsLinks: Map<string, DocumentLinks>,
): string => {
  const massAuditIds = (massDocument.externalEvents ?? [])
    .filter(
      (event) =>
        event.relatedDocument && MASS_AUDIT.matches(event.relatedDocument),
    )
    .map((event) => event.relatedDocument as DocumentReference)
    .map((relatedDocument) => relatedDocument.documentId);

  if (!isNonEmptyArray<string>(massAuditIds)) {
    throw new Error(
      `Mass audit relations not found for mass document ${massDocument.id}`,
    );
  }

  if (massAuditIds.length > 1) {
    logger.warn(
      `Multiple mass audit documents found for mass document ${massDocument.id}`,
    );
    const availableMassAuditIds = massAuditIds.filter((id) =>
      documentsLinks.has(id),
    );

    if (!isNonEmptyArray<string>(availableMassAuditIds)) {
      throw new Error(
        `Mass document ${massDocument.id} does not have an available mass audit document this credit`,
      );
    }

    if (availableMassAuditIds.length > 1) {
      throw new Error(
        `Mass document ${massDocument.id} has more than one available mass audit document this credit: ${availableMassAuditIds.join(', ')}`,
      );
    }

    const massAuditId = availableMassAuditIds[0];

    logger.warn(
      `Using available mass audit document ${massAuditId} for mass document ${massDocument.id}`,
    );

    return massAuditId;
  }

  return massAuditIds[0];
};

export const findMassCertificateIdFromDocumentLinks = (
  massAuditId: string,
  documentsLinks: Map<string, DocumentLinks>,
): string => {
  const massAuditLink = documentsLinks.get(massAuditId);

  const documentId = massAuditLink?.relatedDocuments?.find((related) =>
    MASS_CERTIFICATE.matches(related),
  )?.documentId;

  if (isNil(documentId)) {
    throw new Error('Related document Mass Certificate not found');
  }

  return documentId;
};

export const getMassCertificatesMassValue = (
  massCertificates: MassCertificateMetadata[],
): number =>
  massCertificates.reduce(
    (massCertificatesAccumulator, massCertificate) =>
      massCertificatesAccumulator +
      massCertificate.masses.reduce(
        (massesAccumulator, mass) => massesAccumulator + getMassValue(mass),
        0,
      ),
    0,
  );

export const formatCeritificatesMassValue = (
  massCertificates: MassCertificateMetadata[],
): string =>
  Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(getMassCertificatesMassValue(massCertificates));

export const getMassCertificatesMassIdsCount = (
  massCertificates: MassCertificateMetadata[],
): number =>
  massCertificates.reduce(
    (accumulator, massCertificate) =>
      accumulator + massCertificate.masses.length,
    0,
  );

export const mapMethodologyMetadata = (
  document: Document,
): MethodologyMetadata => {
  const openEvent = document.externalEvents?.find((event) =>
    eventHasName(event, OPEN),
  );

  const { METHODOLOGY_DESCRIPTION, METHODOLOGY_NAME } =
    DocumentEventAttributeName;

  return {
    description: getEventAttributeValue(
      openEvent,
      METHODOLOGY_DESCRIPTION,
    ) as string,
    documentId: document.id,
    name: getEventAttributeValue(openEvent, METHODOLOGY_NAME) as string,
  };
};

export const mapRewardDistributionMetadata = (
  document: Document,
): RewardsDistributionMetadata => {
  const {
    RULE_PROCESSOR_CODE_VERSION,
    RULE_PROCESSOR_RESULT_CONTENT,
    RULE_PROCESSOR_SOURCE_CODE_URL,
    RULE_SLUG,
  } = DocumentEventAttributeName;
  const ruleExecutionEvent = document.externalEvents?.find(
    and(
      eventNameIsAnyOf([RULE_EXECUTION]),
      metadataAttributeValueIsAnyOf(RULE_SLUG, [REWARDS_DISTRIBUTION]),
    ),
  );

  const policyVersion = getEventAttributeValue(
    ruleExecutionEvent,
    RULE_PROCESSOR_CODE_VERSION,
  ) as string;
  const externalUrl = getEventAttributeValue(
    ruleExecutionEvent,
    RULE_PROCESSOR_SOURCE_CODE_URL,
  ) as string;
  const ruleResultContent = getEventAttributeValue(
    ruleExecutionEvent,
    RULE_PROCESSOR_RESULT_CONTENT,
  ) as unknown as RewardDistributionResultContent;

  return {
    externalUrl,
    participants: ruleResultContent.certificateRewards.map(
      (massCertificate) => ({
        id: massCertificate.participant.id,
        share: massCertificate.percentage,
        type: massCertificate.actorType,
      }),
    ) as NonEmptyArray<RewardsDistributionParticipant>,
    policyVersion,
  };
};

export const mapNftMetadataDto = (
  ruleSubject: Omit<MethodologyCreditNftMetadataDto, 'creditDocumentId'>,
  ruleInput: RuleInput,
): MethodologyCreditNftMetadataDto =>
  assertMethodologyCreditNftMetadataDto({
    ...ruleSubject,
    creditDocumentId: ruleInput.documentId,
  });

export const mapNftMetadata = ({
  collectionName,
  creditDocumentId,
  image,
  massCertificates,
  methodology,
  nftDescription,
  rewardsDistribution,
  storeContractAddress,
}: MethodologyCreditNftMetadataDto): NftMetadata => {
  const {
    originCity,
    originCountry,
    originCountryState,
    recyclerName,
    subtype,
    type,
  } = massCertificates[0].masses[0];

  return {
    attributes: [
      {
        trait_type: 'Mass Type',
        value: type,
      },
      {
        trait_type: 'Mass Origin (Country)',
        value: originCountry,
      },
      {
        trait_type: 'Mass Origin (State)',
        value: originCountryState,
      },
      {
        trait_type: 'Mass Origin (City)',
        value: originCity,
      },
      {
        trait_type: 'Recycler',
        value: recyclerName,
      },
      {
        trait_type: 'Credit Type',
        value: 'Recycling Credit',
      },
      {
        trait_type: 'Collection Name',
        value: collectionName,
      },
      {
        trait_type: 'Amount in Kg',
        value: formatCeritificatesMassValue(massCertificates),
      },
    ],
    description: nftDescription,
    details: {
      massCertificates: {
        count: massCertificates.length,
        description:
          'The BOLD mass certificate is a grouping of MassIDs audited according to the BOLD Methodology. MassIDs represent publicly verifiable ownership, and therefore responsibility, over a unit of waste mass with an immutable record of recycling operations (work orders carried out) registered on it.',
        documents: massCertificates.map((massCertificate) => ({
          external_id: massCertificate.documentId,
          external_url: getCarrotExplorePageUrl(massCertificate.documentId),
          mass_id_count: massCertificate.masses.length,
          mass_ids: massCertificate.masses.map((mass) => ({
            external_id: mass.documentId,
            external_url: getCarrotExplorePageUrl(mass.documentId),
            recycler: mass.recyclerName,
            weight: formatWeight(getMassValue(mass)),
          })),
        })) as NonEmptyArray<NftMetadataMassCertificate>,
      },
      methodology: {
        description: methodology.description,
        external_url: getCarrotExplorePageUrl(methodology.documentId),
        name: methodology.name,
        pdf: 'ipfs://bafybeigmved7xq4loti7j6k2k63xp76aofminwdyqgpf7dkw5fqa6vi4tm',
      },
      rewards_distribution: {
        description:
          'This document identifies Carrot’s policy for distributing rewards among waste supply chain participants, determined by category, from Recycling Credits (TRC) and Carbon Credit (TCC) sales. Based on rules defined for the methodology, each participant earns a percentual share of a mass that they acted as a participant.',
        external_url: rewardsDistribution.externalUrl,
        participants: rewardsDistribution.participants,
        policy_version: rewardsDistribution.policyVersion,
      },
      summary: {
        mass_certificate_count: massCertificates.length,
        mass_id_count: getMassCertificatesMassIdsCount(massCertificates),
        mass_origin_city: originCity,
        mass_origin_country: originCountry,
        mass_origin_state: originCountryState,
        mass_subtype: subtype,
        mass_total_weight: formatWeight(
          getMassCertificatesMassValue(massCertificates),
        ),
        mass_type: type,
        recycler_name: recyclerName,
      },
    },
    external_id: creditDocumentId,
    external_url: getCarrotExplorePageUrl(creditDocumentId),
    image:
      image ??
      'ipfs://bafybeiaxb5dwhmai4waltapfxrtf7rzmhulgigy4t27vynvzqtrowktyzi/image.png',
    name: 'BOLD',
    store_contract_address: storeContractAddress,
  };
};
