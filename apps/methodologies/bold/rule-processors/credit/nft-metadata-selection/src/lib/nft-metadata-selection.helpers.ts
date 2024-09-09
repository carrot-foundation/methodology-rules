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
        trait_type: 'Certified Type',
        value: `${type} (${subtype})`,
      },
      {
        trait_type: 'Origin Country',
        value: originCountry,
      },
      {
        trait_type: 'Origin State',
        value: originCountryState,
      },
      {
        trait_type: 'Recycler',
        value: recyclerName,
      },
    ],
    description:
      '"Bold" is the first tokenized recycling certificate (TRC - Tokenized Recycling Credit), which confirms with a high degree of certainty that a mass of material (in kg) has been recycled. The certification of the detour of organic waste from landfills and dumps demonstrates a serious commitment to the environment. BOLD certificates serve as proof of investment in innovative solutions for global sustainability and can be used to meet internal ESG targets.',
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
        certificates_count: certificates.length,
        mass_ids_count: getCertificatesMassIdsCount(certificates),
        mass_ids_total_weight: formatWeight(
          getCertificatesMassValue(certificates),
        ),
        mass_subtype: subtype,
        mass_type: type,
        origin_country: originCountry,
        origin_state: originCountryState,
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
