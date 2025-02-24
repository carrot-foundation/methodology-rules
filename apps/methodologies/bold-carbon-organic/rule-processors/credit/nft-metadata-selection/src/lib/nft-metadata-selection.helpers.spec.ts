import type {
  MethodologyDocumentEventAttributeValue,
  NonEmptyArray,
  UnknownObject,
} from '@carrot-fndn/shared/types';
import type { RequiredDeep } from 'type-fest';

import {
  stubDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/shared/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventRuleSlug,
  DocumentType,
  type RewardDistributionResultContent,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { DocumentEventName } from '@carrot-fndn/shared/methodologies/bold/types';
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
  getMassCertificatesMassIdsCount,
  getMassCertificatesMassValue,
  getMassValue,
  getRulesMetadataEventValues,
  mapMassMetadata,
  mapMethodologyMetadata,
  mapNftMetadata,
  mapNftMetadataDto,
  mapRewardDistributionMetadata,
} from './nft-metadata-selection.helpers';
import { stubMassDocument } from './nft-metadata-selection.stubs';

const {
  ACTOR_TYPE,
  COLLECTION_NAME,
  METHODOLOGY_DESCRIPTION,
  METHODOLOGY_NAME,
  NFT_DESCRIPTION,
  NFT_IMAGE,
  RULE_PROCESSOR_CODE_VERSION,
  RULE_PROCESSOR_RESULT_CONTENT,
  RULE_PROCESSOR_SOURCE_CODE_URL,
  RULE_SLUG,
  STORE_CONTRACT_ADDRESS,
} = DocumentEventAttributeName;
const { RECYCLER } = DocumentEventActorType;
const { ACTOR, OPEN, RULE_EXECUTION, RULES_METADATA } = DocumentEventName;

describe('Helpers', () => {
  describe('getCarrotExplorePageUrl', () => {
    it('should return the correct url', () => {
      const documentId = faker.string.uuid();
      const expected = `https://explore.carrot.eco/document/${documentId}`;

      expect(getCarrotExplorePageUrl(documentId)).toBe(expected);
    });
  });

  describe('getRulesMetadataEventValues', () => {
    it('should throw error when document is undefined', () => {
      expect(() => getRulesMetadataEventValues(undefined)).toThrow(
        'Rules metadata event not found',
      );
    });

    it('should throw error when rules metadata event is not found', () => {
      const documentStub = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: OPEN }, []),
        ],
      });

      expect(() => getRulesMetadataEventValues(documentStub)).toThrow(
        'Rules metadata event not found',
      );
    });

    it('should throw error when required metadata collectionName attribute is missing', () => {
      const documentStub = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: RULES_METADATA }, []),
        ],
      });

      expect(() => getRulesMetadataEventValues(documentStub)).toThrow(
        `Required metadata ${COLLECTION_NAME} attribute is missing`,
      );
    });

    it.each([
      {
        attributes: [
          [COLLECTION_NAME, faker.lorem.word()],
          [NFT_DESCRIPTION, faker.lorem.sentence()],
          [STORE_CONTRACT_ADDRESS, faker.finance.ethereumAddress()],
        ],
        description:
          'should return image as undefined when NFT_IMAGE attribute is missing',
      },
      {
        attributes: [
          [NFT_IMAGE, faker.string.sample()],
          [COLLECTION_NAME, faker.lorem.word()],
          [NFT_DESCRIPTION, faker.lorem.sentence()],
          [STORE_CONTRACT_ADDRESS, faker.finance.ethereumAddress()],
        ],
        description:
          'should return image as undefined when NFT_IMAGE value is not a valid Uri',
      },
    ])('%description', ({ attributes }) => {
      const documentStub = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes(
            { name: RULES_METADATA },
            attributes as [
              DocumentEventAttributeName,
              MethodologyDocumentEventAttributeValue,
            ][],
          ),
        ],
      });

      const result = getRulesMetadataEventValues(documentStub);

      expect(result).toEqual({
        collectionName: expect.any(String),
        image: undefined,
        nftDescription: expect.any(String),
        storeContractAddress: expect.any(String),
      });
    });

    it('should return all metadata values when all attributes are valid', () => {
      const image = faker.internet.url();
      const collectionName = faker.lorem.word();
      const nftDescription = faker.lorem.sentence();
      const storeContractAddress = faker.finance.ethereumAddress();

      const documentStub = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: RULES_METADATA }, [
            [NFT_IMAGE, image],
            [COLLECTION_NAME, collectionName],
            [NFT_DESCRIPTION, nftDescription],
            [STORE_CONTRACT_ADDRESS, storeContractAddress],
          ]),
        ],
      });

      const result = getRulesMetadataEventValues(documentStub);

      expect(result).toEqual({
        collectionName,
        image,
        nftDescription,
        storeContractAddress,
      });
    });

    it('should throw error when collection name is missing', () => {
      const documentStub = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: RULES_METADATA }, [
            [NFT_DESCRIPTION, faker.lorem.sentence()],
            [STORE_CONTRACT_ADDRESS, faker.finance.ethereumAddress()],
          ]),
        ],
      });

      expect(() => getRulesMetadataEventValues(documentStub)).toThrow(
        `Required metadata ${COLLECTION_NAME} attribute is missing`,
      );
    });

    it('should throw error when NFT description is missing', () => {
      const documentStub = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: RULES_METADATA }, [
            [COLLECTION_NAME, faker.lorem.word()],
            [STORE_CONTRACT_ADDRESS, faker.finance.ethereumAddress()],
          ]),
        ],
      });

      expect(() => getRulesMetadataEventValues(documentStub)).toThrow(
        `Required metadata ${NFT_DESCRIPTION} attribute is missing`,
      );
    });

    it('should throw error when store smart contract address is missing', () => {
      const documentStub = stubDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: RULES_METADATA }, [
            [COLLECTION_NAME, faker.lorem.word()],
            [NFT_DESCRIPTION, faker.lorem.sentence()],
          ]),
        ],
      });

      expect(() => getRulesMetadataEventValues(documentStub)).toThrow(
        `Required metadata ${STORE_CONTRACT_ADDRESS} attribute is missing`,
      );
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

      expect(validation).toPassTypiaValidation();
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

      expect(validation).toPassTypiaValidation();
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

      expect(validation).toPassTypiaValidation();
    });
  });

  describe('mapNftMetadata', () => {
    it('should map the nft metadata correctly', () => {
      const methodologyCreditNftMetadataDtoStub =
        random<MethodologyCreditNftMetadataDto>();

      // @ts-expect-error: We are stubbing forced values
      const result = mapNftMetadata(methodologyCreditNftMetadataDtoStub);

      const validation = validate(result);

      expect(validation).toPassTypiaValidation();
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

      expect(validation).toPassTypiaValidation();
    });

    it('should throw an error if the the return value is incorrect', () => {
      const dtoStub = random<MethodologyCreditNftMetadataDto>();

      expect(() =>
        // @ts-expect-error: force invalid return value
        mapNftMetadataDto(dtoStub, ''),
      ).toThrow('createAssert');
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
