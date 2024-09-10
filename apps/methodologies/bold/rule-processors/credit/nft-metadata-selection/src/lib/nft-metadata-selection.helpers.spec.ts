import type { NonEmptyArray, UnknownObject } from '@carrot-fndn/shared/types';
import type { RequiredDeep } from 'type-fest';

import {
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
  CertificateMetadata,
  MassMetadata,
  MethodologyCreditNftMetadataDto,
} from './nft-metadata-selection.dto';
import type { DocumentLinks } from './nft-metadata-selection.processor';

import {
  findCertificateIdFromDocumentLinks,
  findMassValidationId,
  formatCeritificatesMassValue,
  formatWeight,
  getCarrotExplorePageUrl,
  getCertificatesMassIdsCount,
  getCertificatesMassValue,
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

        expect(result).toBe(`${weight}kg`);
      },
    );
  });

  describe('getCertificatesMassValue', () => {
    it('should return the correct total weight', () => {
      const certificatesStub: NonEmptyArray<CertificateMetadata> = [
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

      const result = getCertificatesMassValue(certificatesStub);

      expect(result).toBe(10);
    });
  });

  describe('getCertificatesMassIdsCount', () => {
    it('should return the correct total mass ids count', () => {
      const certificatesStub: NonEmptyArray<CertificateMetadata> = [
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

      const result = getCertificatesMassIdsCount(certificatesStub);

      expect(result).toBe(certificatesStub[0].masses.length + 2);
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

  describe('findCertificateIdFromDocumentLinks', () => {
    it('should return the correct certificate id', () => {
      const massValidationId = faker.string.uuid();
      const certificateId = faker.string.uuid();
      const documentsLinks = new Map([
        ...random<Map<string, DocumentLinks>>(),
        [
          massValidationId,
          {
            parentDocumentId: faker.string.uuid(),
            relatedDocuments: [
              {
                category: DocumentCategory.METHODOLOGY,
                documentId: certificateId,
                type: DocumentType.CERTIFICATE,
              },
            ],
          },
        ],
      ]);

      const result = findCertificateIdFromDocumentLinks(
        massValidationId,
        documentsLinks,
      );

      expect(result).toBe(certificateId);
    });

    it('should throw an error if the certificate id is not found', () => {
      const massValidationId = faker.string.uuid();
      const documentsLinks = random<Map<string, DocumentLinks>>();

      expect(() =>
        findCertificateIdFromDocumentLinks(massValidationId, documentsLinks),
      ).toThrowErrorMatchingSnapshot();
    });
  });

  describe('findMassValidationId', () => {
    it('should return the correct mass validation id', () => {
      const massValidationId = faker.string.uuid();
      const documentStub = stubMassDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({
            relatedDocument: {
              category: DocumentCategory.METHODOLOGY,
              documentId: massValidationId,
              type: DocumentType.MASS_VALIDATION,
            },
          }),
        ],
      });

      const result = findMassValidationId(documentStub, new Map());

      expect(result).toBe(massValidationId);
    });

    it('should throw an error if the mass validation id is not found', () => {
      const documentStub = stubMassDocument();

      expect(() => findMassValidationId(documentStub, new Map())).toThrow(
        `Mass validation relations not found for mass document ${documentStub.id}`,
      );
    });

    it('should throw an error if external events is undefined', () => {
      const documentStub = stubMassDocument();

      documentStub.externalEvents = undefined;

      expect(() => findMassValidationId(documentStub, new Map())).toThrow(
        `Mass validation relations not found for mass document ${documentStub.id}`,
      );
    });

    it('should throw an error if there are multiple mass validations for the same mass without a link to the loaded documents', () => {
      const documentStub = stubMassDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({
            relatedDocument: {
              category: DocumentCategory.METHODOLOGY,
              type: DocumentType.MASS_VALIDATION,
            },
          }),
          stubDocumentEventWithMetadataAttributes({
            relatedDocument: {
              category: DocumentCategory.METHODOLOGY,
              type: DocumentType.MASS_VALIDATION,
            },
          }),
        ],
      });

      expect(() => findMassValidationId(documentStub, new Map())).toThrow(
        `Mass document ${documentStub.id} does not have an available mass validation document this credit`,
      );
    });

    it('should throw an error if there are multiple mass validations linked to the loaded documents', () => {
      const massValidationIds = stubArray(faker.string.uuid, 5);
      const documentStub = stubMassDocument({
        externalEvents: massValidationIds.map((massValidationId) =>
          stubDocumentEventWithMetadataAttributes({
            relatedDocument: {
              category: DocumentCategory.METHODOLOGY,
              documentId: massValidationId,
              type: DocumentType.MASS_VALIDATION,
            },
          }),
        ),
      });

      const documentsLinks = new Map([
        ...random<Map<string, DocumentLinks>>(),
        ...new Map(
          massValidationIds.map((massValidationId) => [
            massValidationId,
            {
              parentDocumentId: faker.string.uuid(),
              relatedDocuments: [],
            },
          ]),
        ),
      ]);

      expect(() => findMassValidationId(documentStub, documentsLinks)).toThrow(
        `Mass document ${documentStub.id} has more than one available mass validation document this credit`,
      );
    });

    it('should return massValidationId if there are multiple mass validations but only one linked to the loaded documents', () => {
      const massValidationIds = stubArray(faker.string.uuid, 5);
      const documentStub = stubMassDocument({
        externalEvents: massValidationIds.map((massValidationId) =>
          stubDocumentEventWithMetadataAttributes({
            relatedDocument: {
              category: DocumentCategory.METHODOLOGY,
              documentId: massValidationId,
              type: DocumentType.MASS_VALIDATION,
            },
          }),
        ),
      });

      const massValidationId = assert<string>(massValidationIds[0]);

      const documentsLinks = new Map([
        ...random<Map<string, DocumentLinks>>(),
        [
          massValidationId,
          {
            parentDocumentId: faker.string.uuid(),
            relatedDocuments: [],
          },
        ],
      ]);

      const result = findMassValidationId(documentStub, documentsLinks);

      expect(result).toBe(massValidationId);
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
      const certificatesStub: CertificateMetadata[] = [
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

      const result = formatCeritificatesMassValue(certificatesStub);

      expect(result).toBe('9,124.68');
    });
  });
});
