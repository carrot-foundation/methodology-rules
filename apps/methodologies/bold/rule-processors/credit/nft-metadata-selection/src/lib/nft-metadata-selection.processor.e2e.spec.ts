import type { UnknownObject } from '@carrot-fndn/shared/types';

import {
  stubDocumentEvent,
  stubDocumentEventAttribute,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/testing';
import {
  type Document,
  DocumentCategory,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventName,
  DocumentEventRuleSlug,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
  type RewardDistributionResultContent,
} from '@carrot-fndn/methodologies/bold/types';
import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import {
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubArray,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random, validate } from 'typia';

import type { NftMetadata } from './nft-metadata-selection.types';

import { handler } from '../lambda';
import {
  stubCreditCertificatesDocument,
  stubCreditDocument,
  stubDocumentOutputEvent,
  stubDocumentRelatedEvent,
  stubMassAuditDocument,
  stubMassCertificateAuditDocument,
  stubMassCertificateDocument,
  stubMassDocument,
  stubMethodologyDefinitionDocument,
} from './nft-metadata-selection.stubs';

const { RECYCLER } = DocumentEventActorType;
const { REWARDS_DISTRIBUTION } = DocumentEventRuleSlug;
const { ACTOR, LINK, RULE_EXECUTION, RULES_METADATA } = DocumentEventName;
const {
  ACTOR_TYPE,
  COLLECTION_NAME,
  NFT_DESCRIPTION,
  RULE_PROCESSOR_CODE_VERSION,
  RULE_PROCESSOR_RESULT_CONTENT,
  RULE_PROCESSOR_SOURCE_CODE_URL,
  RULE_SLUG,
} = DocumentEventAttributeName;
const { MASS, METHODOLOGY } = DocumentCategory;
const {
  CREDIT_CERTIFICATES,
  MASS_AUDIT,
  MASS_CERTIFICATE,
  MASS_CERTIFICATE_AUDIT,
} = DocumentType;

describe('NftMetadataSelection E2E', () => {
  const documentKeyPrefix = faker.string.uuid();
  const creditDocumentId = faker.string.uuid();
  const image = faker.internet.url();

  // TODO: Refac this test to use a builder or a stub that prepares the documents https://app.clickup.com/t/86a36ut5a
  const creditDocumentReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: creditDocumentId,
    type: DocumentType.CREDIT,
  };
  const massCertificateAuditsReferences: DocumentReference[] = stubArray(
    () => ({
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      subtype: DocumentSubtype.PROCESS,
      type: MASS_CERTIFICATE_AUDIT,
    }),
    2,
  );
  const massesReferences: DocumentReference[] = stubArray(
    () => ({
      category: MASS,
      documentId: faker.string.uuid(),
    }),
    10,
  );
  const massAuditsReferences: DocumentReference[] = stubArray(
    () => ({
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      type: MASS_AUDIT,
    }),
    massesReferences.length,
  );
  const massCertificatesReferences: DocumentReference[] = stubArray(
    () => ({
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      type: MASS_CERTIFICATE,
    }),
    2,
  );
  const creditCertificatesReference: DocumentReference = {
    category: METHODOLOGY,
    documentId: faker.string.uuid(),
    subtype: DocumentSubtype.GROUP,
    type: CREDIT_CERTIFICATES,
  };
  const methodologyDefinitionReference: DocumentReference = {
    category: METHODOLOGY,
    documentId: faker.string.uuid(),
    type: DocumentType.DEFINITION,
  };

  const creditDocumentStub = stubCreditDocument({
    externalEvents: [
      stubDocumentEvent({
        metadata: {
          attributes: [
            stubDocumentEventAttribute({
              name: DocumentEventAttributeName.NFT_IMAGE,
              value: image,
            }),
            stubDocumentEventAttribute({
              name: COLLECTION_NAME,
              value: faker.lorem.word(),
            }),
            stubDocumentEventAttribute({
              name: NFT_DESCRIPTION,
              value: faker.lorem.sentence(),
            }),
          ],
        },
        name: RULES_METADATA,
        referencedDocument: undefined,
        relatedDocument: undefined,
      }),
      stubDocumentOutputEvent(creditCertificatesReference),
      stubDocumentEvent({
        name: LINK,
        relatedDocument: methodologyDefinitionReference,
      }),
    ],
    id: creditDocumentReference.documentId,
  });

  const creditCertificatesDocumentStub = stubCreditCertificatesDocument({
    externalEvents: massCertificateAuditsReferences.map(
      (massCertificateAudit) => stubDocumentRelatedEvent(massCertificateAudit),
    ),
    id: creditCertificatesReference.documentId,
    parentDocumentId: creditDocumentId,
  });

  const massCertificateAuditsDocumentsStubs = massCertificatesReferences.map(
    (massCertificate, index) =>
      stubMassCertificateAuditDocument({
        externalEvents: [
          stubDocumentRelatedEvent(creditCertificatesReference),
          stubDocumentEventWithMetadataAttributes({ name: RULE_EXECUTION }, [
            [RULE_SLUG, REWARDS_DISTRIBUTION],
            [RULE_PROCESSOR_CODE_VERSION, faker.git.commitSha()],
            [RULE_PROCESSOR_SOURCE_CODE_URL, faker.internet.url()],
            [
              RULE_PROCESSOR_RESULT_CONTENT,
              random<RewardDistributionResultContent>() as unknown as UnknownObject,
            ],
          ]),
        ],
        id: massCertificateAuditsReferences[index]!.documentId,
        parentDocumentId: massCertificate.documentId,
      }),
  );

  const massCertificatesDocumentsStubs = massCertificatesReferences.map(
    (massCertificateReference, index) => {
      const firstFiveMassesValidations = massAuditsReferences.slice(0, 5);
      const lastFiveMassesValidations = massAuditsReferences.slice(5);

      return stubMassCertificateDocument({
        externalEvents: [
          ...(index === 0
            ? firstFiveMassesValidations.map((massAuditReference) =>
                stubDocumentRelatedEvent(massAuditReference),
              )
            : lastFiveMassesValidations.map((massAuditReference) =>
                stubDocumentRelatedEvent(massAuditReference),
              )),
          stubDocumentOutputEvent(massCertificateAuditsReferences[index]!),
        ],
        id: massCertificateReference.documentId,
      });
    },
  );

  const massAuditsDocumentStubs = massesReferences.map((massReference, index) =>
    stubMassAuditDocument({
      externalEvents: [
        index < 5
          ? stubDocumentRelatedEvent(massCertificatesReferences[0]!)
          : stubDocumentRelatedEvent(massCertificatesReferences[1]!),
      ],
      id: massAuditsReferences[index]!.documentId,
      parentDocumentId: massReference.documentId,
    }),
  );

  const massesDocumentStubs = massesReferences.map((massReference, index) =>
    stubMassDocument({
      externalEvents: [
        stubDocumentOutputEvent(massAuditsReferences[index]!),
        stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
          [ACTOR_TYPE, RECYCLER],
        ]),
      ],
      id: massReference.documentId,
    }),
  );

  const methodologyDefinitionDocumentStub = stubMethodologyDefinitionDocument({
    id: methodologyDefinitionReference.documentId,
  });

  const documents: Document[] = [
    creditDocumentStub,
    methodologyDefinitionDocumentStub,
    creditCertificatesDocumentStub,
    ...massCertificateAuditsDocumentsStubs,
    ...massCertificatesDocumentsStubs,
    ...massAuditsDocumentStubs,
    ...massesDocumentStubs,
  ];

  beforeAll(() => {
    prepareEnvironmentTestE2E(
      documents.map((document) => ({
        document,
        documentKey: toDocumentKey({
          documentId: document.id,
          documentKeyPrefix,
        }),
      })),
    );
  });

  it('should return the rule output APPROVED and with the extracted NFT metadata', async () => {
    const response = (await handler(
      stubRuleInput({
        documentId: creditDocumentId,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as RuleOutput;

    const validationResultContent = validate<NftMetadata>(
      response.resultContent,
    );

    expect(validationResultContent.errors).toEqual([]);
    expect(response.resultStatus).toBe(RuleOutputStatus.APPROVED);
    expect(response.resultContent?.['image']).toBe(image);
  });
});
