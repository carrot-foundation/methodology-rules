import type { RuleInput } from '@carrot-fndn/shared/rule/types';
import type { NonEmptyArray } from '@carrot-fndn/shared/types';

import { getEventAttributeValue } from '@carrot-fndn/methodologies/bold/getters';
import {
  CERTIFICATE,
  MASS_VALIDATION,
} from '@carrot-fndn/methodologies/bold/matchers';
import {
  and,
  eventHasName,
  eventNameIsAnyOf,
  metadataAttributeValueIsAnyOf,
} from '@carrot-fndn/methodologies/bold/predicates';
import {
  type Document,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventRuleSlug,
  type DocumentReference,
  type RewardDistributionResultContent,
} from '@carrot-fndn/methodologies/bold/types';
import { isNil, isNonEmptyArray } from '@carrot-fndn/shared/helpers';
import { assert } from 'typia';

import type {
  CertificateMetadata,
  MassMetadata,
  MethodologyCreditNftMetadataDto,
  MethodologyMetadata,
  RewardsDistributionMetadata,
  RewardsDistributionParticipant,
} from './nft-metadata-selection.dto';
import type { DocumentLinks } from './nft-metadata-selection.processor';
import type {
  NftMetadata,
  NftMetadataCertificate,
} from './nft-metadata-selection.types';

const { RECYCLER } = DocumentEventActorType;
const { ACTOR, OPEN, RULE_EXECUTION } = DocumentEventName;
const { ACTOR_TYPE } = DocumentEventAttributeName;
const { REWARDS_DISTRIBUTION } = DocumentEventRuleSlug;

const logger = console;

export const getCarrotExplorePageUrl = (documentId: string) =>
  `https://explore.carrot.eco/document/${documentId}`;

export const mapMassMetadata = (document: Document): MassMetadata => ({
  documentId: document.id,
  measurementUnit: document.measurementUnit,
  originCountry: document.primaryAddress.countryCode,
  originCountryState: document.primaryAddress.countryState,
  recyclerName: document.externalEvents?.find(
    and(
      eventNameIsAnyOf([ACTOR]),
      metadataAttributeValueIsAnyOf(ACTOR_TYPE, [RECYCLER]),
    ),
  )?.participant.name as string,
  subtype: document.subtype as string,
  type: document.type as string,
  value: document.currentValue,
});

export const getMassValue = (mass: MassMetadata): number => mass.value;

export const formatWeight = (weight: number): string => `${weight}kg`;

export const findMassValidationId = (
  massDocument: Document,
  documentsLinks: Map<string, DocumentLinks>,
): string => {
  const massValidationIds = (massDocument.externalEvents ?? [])
    .filter(
      (event) =>
        event.relatedDocument && MASS_VALIDATION.matches(event.relatedDocument),
    )
    .map((event) => event.relatedDocument as DocumentReference)
    .map((relatedDocument) => relatedDocument.documentId);

  if (!isNonEmptyArray<string>(massValidationIds)) {
    throw new Error(
      `Mass validation relations not found for mass document ${massDocument.id}`,
    );
  }

  if (massValidationIds.length > 1) {
    logger.warn(
      `Multiple mass validation documents found for mass document ${massDocument.id}`,
    );
    const availableMassValidationIds = massValidationIds.filter((id) =>
      documentsLinks.has(id),
    );

    if (!isNonEmptyArray<string>(availableMassValidationIds)) {
      throw new Error(
        `Mass document ${massDocument.id} does not have an available mass validation document this credit`,
      );
    }

    if (availableMassValidationIds.length > 1) {
      throw new Error(
        `Mass document ${massDocument.id} has more than one available mass validation document this credit: ${availableMassValidationIds.join(', ')}`,
      );
    }

    const massValidationId = availableMassValidationIds[0];

    logger.warn(
      `Using available mass validation document ${massValidationId} for mass document ${massDocument.id}`,
    );

    return massValidationId;
  }

  return massValidationIds[0];
};

export const findCertificateIdFromDocumentLinks = (
  massValidationId: string,
  documentsLinks: Map<string, DocumentLinks>,
): string => {
  const massValidationLink = documentsLinks.get(massValidationId);

  const documentId = massValidationLink?.relatedDocuments?.find((related) =>
    CERTIFICATE.matches(related),
  )?.documentId;

  if (isNil(documentId)) {
    throw new Error('Related document Certificate not found');
  }

  return documentId;
};

export const getCertificatesMassValue = (
  certificates: CertificateMetadata[],
): number =>
  certificates.reduce(
    (certificatesAccumulator, certificate) =>
      certificatesAccumulator +
      certificate.masses.reduce(
        (massesAccumulator, mass) => massesAccumulator + getMassValue(mass),
        0,
      ),
    0,
  );

export const formatCeritificatesMassValue = (
  certificates: CertificateMetadata[],
): string =>
  Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(getCertificatesMassValue(certificates));

export const getCertificatesMassIdsCount = (
  certificates: CertificateMetadata[],
): number =>
  certificates.reduce(
    (accumulator, certificate) => accumulator + certificate.masses.length,
    0,
  );

export const mapMethodologyMetadata = (
  document: Document,
): MethodologyMetadata => {
  const openEvent = document.externalEvents?.find((event) =>
    eventHasName(event, OPEN),
  );

  const { CERTIFICATE_VALUE_LABEL, METHODOLOGY_DESCRIPTION, METHODOLOGY_NAME } =
    DocumentEventAttributeName;

  return {
    certificateValueLabel: getEventAttributeValue(
      openEvent,
      CERTIFICATE_VALUE_LABEL,
    ) as string,
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
    participants: ruleResultContent.certificateRewards.map((certificate) => ({
      id: certificate.participant.id,
      share: certificate.percentage,
      type: certificate.actorType,
    })) as NonEmptyArray<RewardsDistributionParticipant>,
    policyVersion,
  };
};

export const mapNftMetadataDto = (
  ruleSubject: Omit<MethodologyCreditNftMetadataDto, 'creditDocumentId'>,
  ruleInput: RuleInput,
): MethodologyCreditNftMetadataDto =>
  assert<MethodologyCreditNftMetadataDto>({
    ...ruleSubject,
    creditDocumentId: ruleInput.documentId,
  });

export const mapNftMetadata = ({
  certificates,
  creditDocumentId,
  methodology,
  rewardsDistribution,
}: MethodologyCreditNftMetadataDto): NftMetadata => {
  const { originCountry, originCountryState, recyclerName, subtype, type } =
    certificates[0].masses[0];

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
        trait_type: 'Recycler',
        value: recyclerName,
      },
      {
        trait_type: 'Amount in Kg',
        value: formatCeritificatesMassValue(certificates),
      },
    ],
    description:
      'This NFT is part of a 10-NFT collection called "BOLD Innovators." BOLD Innovators is the first set of credits (and therefore NFTs) issued on the Carrot Network. The collection is reserved for individuals who are uniquely qualified to understand the environmental and social value that BOLD (Breakthrough in Organic Landfill Diversion) produces for the world, as well as to validate the functionality of a technology expected to be one of the most important ever created to combat climate change and waste pollution. BOLD represents approximately 1 ton of organic waste diverted from a landfill to a composting facility for proper biological treatment. The Carrot team views BOLD as the most significant environmental asset developed to date, as it enables the transition to a resource-efficient, low-carbon circular economy. The use of BOLD at scale will significantly reduce system-wide greenhouse gas emissions, preserve natural resources, reduce waste pollution, and prevent methane emissions at landfills. You can find more details about BOLD and its attributes in the methodologies section of www.carrot.eco',
    details: {
      certificates: {
        count: certificates.length,
        description:
          'The BOLD certificate is a grouping of MassIDs audited according to the BOLD Methodology. MassIDs represent publicly verifiable ownership, and therefore responsibility, over a unit of waste mass with an immutable record of recycling operations (work orders carried out) registered on it.',
        documents: certificates.map((certificate) => ({
          external_id: certificate.documentId,
          external_url: getCarrotExplorePageUrl(certificate.documentId),
          mass_id_count: certificate.masses.length,
          mass_ids: certificate.masses.map((mass) => ({
            external_id: mass.documentId,
            external_url: getCarrotExplorePageUrl(mass.documentId),
            recycler: mass.recyclerName,
            weight: formatWeight(getMassValue(mass)),
          })),
        })) as NonEmptyArray<NftMetadataCertificate>,
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
        certificate_label: 'Organics Landfill Diversion',
        mass_certificate_count: certificates.length,
        mass_id_count: getCertificatesMassIdsCount(certificates),
        mass_origin_country: originCountry,
        mass_origin_state: originCountryState,
        mass_subtype: subtype,
        mass_total_weight: formatWeight(getCertificatesMassValue(certificates)),
        mass_type: type,
        recycler_name: recyclerName,
      },
    },
    external_id: creditDocumentId,
    external_url: getCarrotExplorePageUrl(creditDocumentId),
    image:
      'ipfs://bafybeiaxb5dwhmai4waltapfxrtf7rzmhulgigy4t27vynvzqtrowktyzi/image.png',
    name: 'BOLD',
  };
};
