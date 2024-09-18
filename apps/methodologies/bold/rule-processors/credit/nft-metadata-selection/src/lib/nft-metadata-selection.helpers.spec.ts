import type { NonEmptyArray, UnknownObject } from '@carrot-fndn/shared/types';
import type { RequiredDeep } from 'type-fest';

import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventRuleSlug,
  DocumentType,
  type RewardDistributionResultContent,
} from '@carrot-fndn/methodologies/bold/types';
import { stubArray, stubRuleInput } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { assert, random, validate } from 'typia';

import type {
  MassCertificateMetadata,
  MassMetadata,
  MethodologyCreditNftMetadataDto,
} from './nft-metadata-selection.dto';
import type { DocumentLinks } from './nft-metadata-selection.processor';

import {
  findMassAuditId,
  findMassCertificateIdFromDocumentLinks,
  formatCeritificatesMassValue,
  formatWeight,
  getCarrotExplorePageUrl,
  getImageFromMetadata,
  getMassCertificatesMassIdsCount,
  getMassCertificatesMassValue,
  getMassValue,
  mapMassMetadata,
  mapMethodologyMetadata,
  mapNftMetadata,
  mapNftMetadataDto,
  mapRewardDistributionMetadata,
} from './nft-metadata-selection.helpers';
import { stubMassDocument } from './nft-metadata-selection.stubs';

const {
  ACTOR_TYPE,
  METHODOLOGY_DESCRIPTION,
  METHODOLOGY_NAME,
  NFT_IMAGE,
  RULE_PROCESSOR_CODE_VERSION,
  RULE_PROCESSOR_RESULT_CONTENT,
  RULE_PROCESSOR_SOURCE_CODE_URL,
  RULE_SLUG,
} = DocumentEventAttributeName;
const { RECYCLER } = DocumentEventActorType;
const { ACTOR, OPEN, RULE_EXECUTION } = DocumentEventName;

describe('Helpers', () => {
  describe('getCarrotExplorePageUrl', () => {
    it('should return the correct url', () => {
      const documentId = faker.string.uuid();
      const expected = `https://explore.carrot.eco/document/${documentId}`;

      expect(getCarrotExplorePageUrl(documentId)).toBe(expected);
    });
  });

  describe('getImageFromMetadata', () => {
    it('should return undefined if the open event does not have the NFT_IMAGE attribute', () => {
      const documentStub = stubDocument({
        externalEvents: [stubDocumentEvent({ name: OPEN })],
      });

      const result = getImageFromMetadata(documentStub);

      expect(result).toBe(undefined);
    });

    it('should return undefined if the metadata value is not a valid Uri', () => {
      const documentStub = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
            [NFT_IMAGE, faker.string.sample()],
          ]),
        ],
      });

      const result = getImageFromMetadata(documentStub);

      expect(result).toBe(undefined);
    });

    it('should return the metadata value if it is a valid Uri', () => {
      const image = faker.internet.url();
      const documentStub = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
            [NFT_IMAGE, image],
          ]),
        ],
      });

      const result = getImageFromMetadata(documentStub);

      expect(result).toBe(image);
    });
  });

  describe('mapMassMetadata', () => {
    it('should map the mass metadata correctly', () => {
      const documentStub = {
        ...random<RequiredDeep<Document>>(),
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
            [ACTOR_TYPE, RECYCLER],
          ]),
        ],
      };

      const result = mapMassMetadata(documentStub);

      const validation = validate<MassMetadata>(result);

      expect(validation.errors).toEqual([]);
    });
  });

  describe('getMassValue', () => {
    it.each([...stubArray(faker.number.int), ...stubArray(faker.number.float)])(
      'should return the correct value %p',
      (value) => {
        const massStub = {
          ...random<MassMetadata>(),
          value,
        };

        const result = getMassValue(massStub);

        expect(result).toBe(value);
      },
    );
  });

  describe('formatWeight', () => {
    it.each([...stubArray(faker.number.int), ...stubArray(faker.number.float)])(
      'should return the correct formatted weight %p',
      (weight) => {
        const result = formatWeight(weight);

        expect(result).toBe(
          `${Intl.NumberFormat('en-US', {
            maximumFractionDigits: 2,
          }).format(weight)}kg`,
        );
      },
    );
  });

  describe('getMassCertificatesMassValue', () => {
    it('should return the correct total weight', () => {
      const massCertificatesStub: NonEmptyArray<MassCertificateMetadata> = [
        {
          documentId: faker.string.uuid(),
          masses: [
            {
              ...random<MassMetadata>(),
              value: 1,
            },
            {
              ...random<MassMetadata>(),
              value: 2,
            },
          ],
        },
        {
          documentId: faker.string.uuid(),
          masses: [
            {
              ...random<MassMetadata>(),
              value: 3,
            },
            {
              ...random<MassMetadata>(),
              value: 4,
            },
          ],
        },
      ];

      const result = getMassCertificatesMassValue(massCertificatesStub);

      expect(result).toBe(10);
    });
  });

  describe('getMassCertificatesMassIdsCount', () => {
    it('should return the correct total mass ids count', () => {
      const massCertificatesStub: NonEmptyArray<MassCertificateMetadata> = [
        {
          documentId: faker.string.uuid(),
          masses: random<
            NonEmptyArray<MassMetadata>
          >() as NonEmptyArray<MassMetadata>,
        },
        {
          documentId: faker.string.uuid(),
          masses: [random<MassMetadata>(), random<MassMetadata>()],
        },
      ];

      const result = getMassCertificatesMassIdsCount(massCertificatesStub);

      expect(result).toBe(massCertificatesStub[0].masses.length + 2);
    });
  });

  describe('mapMethodologyMetadata', () => {
    it('should map the methodology metadata correctly', () => {
      const documentStub = {
        ...random<RequiredDeep<Document>>(),
        externalEvents: [
          ...stubArray(stubDocumentEvent),
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, [
            [METHODOLOGY_DESCRIPTION, faker.lorem.sentence()],
            [METHODOLOGY_NAME, faker.lorem.sentence()],
          ]),
        ],
      };

      const result = mapMethodologyMetadata(documentStub);

      const validation = validate(result);

      expect(validation.errors).toEqual([]);
    });
  });

  describe('mapRewardDistributionMetadata', () => {
    it('should map the reward distribution metadata correctly', () => {
      const documentStub = {
        ...random<RequiredDeep<Document>>(),
        externalEvents: [
          ...stubArray(stubDocumentEvent),
          stubDocumentEventWithMetadataAttributes({ name: RULE_EXECUTION }, [
            [RULE_SLUG, DocumentEventRuleSlug.REWARDS_DISTRIBUTION],
            [RULE_PROCESSOR_CODE_VERSION, faker.git.commitSha()],
            [RULE_PROCESSOR_SOURCE_CODE_URL, faker.internet.url()],
            [
              RULE_PROCESSOR_RESULT_CONTENT,
              random<RewardDistributionResultContent>() as unknown as UnknownObject,
            ],
          ]),
        ],
      };

      const result = mapRewardDistributionMetadata(documentStub);

      const validation = validate(result);

      expect(validation.errors).toEqual([]);
    });
  });

  describe('mapNftMetadata', () => {
    it('should map the nft metadata correctly', () => {
      const methodologyCreditNftMetadataDtoStub =
        random<MethodologyCreditNftMetadataDto>();

      // @ts-expect-error: We are stubbing forced values
      const result = mapNftMetadata(methodologyCreditNftMetadataDtoStub);

      const validation = validate(result);

      expect(validation.errors).toEqual([]);
    });
  });

  describe('findMassCertificateIdFromDocumentLinks', () => {
    it('should return the correct mass certificate id', () => {
      const massAuditId = faker.string.uuid();
      const massCertificateId = faker.string.uuid();
      const documentsLinks = new Map([
        ...random<Map<string, DocumentLinks>>(),
        [
          massAuditId,
          {
            parentDocumentId: faker.string.uuid(),
            relatedDocuments: [
              {
                category: DocumentCategory.METHODOLOGY,
                documentId: massCertificateId,
                type: DocumentType.MASS_CERTIFICATE,
              },
            ],
          },
        ],
      ]);

      const result = findMassCertificateIdFromDocumentLinks(
        massAuditId,
        documentsLinks,
      );

      expect(result).toBe(massCertificateId);
    });

    it('should throw an error if the mass certificate id is not found', () => {
      const massAuditId = faker.string.uuid();
      const documentsLinks = random<Map<string, DocumentLinks>>();

      expect(() =>
        findMassCertificateIdFromDocumentLinks(massAuditId, documentsLinks),
      ).toThrowErrorMatchingSnapshot();
    });
  });

  describe('findMassAuditId', () => {
    it('should return the correct mass audit id', () => {
      const massAuditId = faker.string.uuid();
      const documentStub = stubMassDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({
            relatedDocument: {
              category: DocumentCategory.METHODOLOGY,
              documentId: massAuditId,
              type: DocumentType.MASS_AUDIT,
            },
          }),
        ],
      });

      const result = findMassAuditId(documentStub, new Map());

      expect(result).toBe(massAuditId);
    });

    it('should throw an error if the mass audit id is not found', () => {
      const documentStub = stubMassDocument();

      expect(() => findMassAuditId(documentStub, new Map())).toThrow(
        `Mass audit relations not found for mass document ${documentStub.id}`,
      );
    });

    it('should throw an error if external events is undefined', () => {
      const documentStub = stubMassDocument();

      documentStub.externalEvents = undefined;

      expect(() => findMassAuditId(documentStub, new Map())).toThrow(
        `Mass audit relations not found for mass document ${documentStub.id}`,
      );
    });

    it('should throw an error if there are multiple mass audits for the same mass without a link to the loaded documents', () => {
      const documentStub = stubMassDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({
            relatedDocument: {
              category: DocumentCategory.METHODOLOGY,
              type: DocumentType.MASS_AUDIT,
            },
          }),
          stubDocumentEventWithMetadataAttributes({
            relatedDocument: {
              category: DocumentCategory.METHODOLOGY,
              type: DocumentType.MASS_AUDIT,
            },
          }),
        ],
      });

      expect(() => findMassAuditId(documentStub, new Map())).toThrow(
        `Mass document ${documentStub.id} does not have an available mass audit document this credit`,
      );
    });

    it('should throw an error if there are multiple mass audits linked to the loaded documents', () => {
      const massAuditIds = stubArray(faker.string.uuid, 5);
      const documentStub = stubMassDocument({
        externalEvents: massAuditIds.map((massAuditId) =>
          stubDocumentEventWithMetadataAttributes({
            relatedDocument: {
              category: DocumentCategory.METHODOLOGY,
              documentId: massAuditId,
              type: DocumentType.MASS_AUDIT,
            },
          }),
        ),
      });

      const documentsLinks = new Map([
        ...random<Map<string, DocumentLinks>>(),
        ...new Map(
          massAuditIds.map((massAuditId) => [
            massAuditId,
            {
              parentDocumentId: faker.string.uuid(),
              relatedDocuments: [],
            },
          ]),
        ),
      ]);

      expect(() => findMassAuditId(documentStub, documentsLinks)).toThrow(
        `Mass document ${documentStub.id} has more than one available mass audit document this credit`,
      );
    });

    it('should return massAuditId if there are multiple mass audits but only one linked to the loaded documents', () => {
      const massAuditIds = stubArray(faker.string.uuid, 5);
      const documentStub = stubMassDocument({
        externalEvents: massAuditIds.map((massAuditId) =>
          stubDocumentEventWithMetadataAttributes({
            relatedDocument: {
              category: DocumentCategory.METHODOLOGY,
              documentId: massAuditId,
              type: DocumentType.MASS_AUDIT,
            },
          }),
        ),
      });

      const massAuditId = assert<string>(massAuditIds[0]);

      const documentsLinks = new Map([
        ...random<Map<string, DocumentLinks>>(),
        [
          massAuditId,
          {
            parentDocumentId: faker.string.uuid(),
            relatedDocuments: [],
          },
        ],
      ]);

      const result = findMassAuditId(documentStub, documentsLinks);

      expect(result).toBe(massAuditId);
    });
  });

  describe('mapNftMetadataDto', () => {
    it('should map the nft metadata dto correctly', () => {
      const ruleInputDto = stubRuleInput();
      const dtoStub = random<MethodologyCreditNftMetadataDto>();

      // @ts-expect-error: We are stubbing forced values
      const result = mapNftMetadataDto(dtoStub, ruleInputDto);

      const validation = validate<MethodologyCreditNftMetadataDto>(result);

      expect(validation.errors).toEqual([]);
    });

    it('should throw an error if the the return value is incorrect', () => {
      const dtoStub = random<MethodologyCreditNftMetadataDto>();

      expect(() =>
        // @ts-expect-error: force invalid return value
        mapNftMetadataDto(dtoStub, ''),
      ).toThrow('assert');
    });
  });

  describe('formatCeritificatesMassValue', () => {
    it('should return the formatted total mass value', () => {
      const massCertificatesStub: MassCertificateMetadata[] = [
        {
          documentId: faker.string.uuid(),
          masses: [
            {
              ...random<MassMetadata>(),
              value: 1234.56,
            },
          ],
        },
        {
          documentId: faker.string.uuid(),
          masses: [
            {
              ...random<MassMetadata>(),
              value: 7890.12,
            },
          ],
        },
      ];

      const result = formatCeritificatesMassValue(massCertificatesStub);

      expect(result).toBe('9,124.68');
    });
  });
});
