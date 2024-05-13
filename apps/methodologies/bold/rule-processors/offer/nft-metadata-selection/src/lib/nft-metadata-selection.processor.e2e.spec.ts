import type { UnknownObject } from '@carrot-fndn/shared/types';

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
  stubCertificateAuditDocument,
  stubCertificateDocument,
  stubDocumentOutputEvent,
  stubDocumentRelatedEvent,
  stubMassDocument,
  stubMassValidationDocument,
  stubMethodologyDefinitionDocument,
  stubOfferCertificatesDocument,
  stubOfferDocument,
} from './nft-metadata-selection.stubs';

const { RECYCLER } = DocumentEventActorType;
const { REWARDS_DISTRIBUTION } = DocumentEventRuleSlug;
const { ACTOR, LINK, RULE_EXECUTION } = DocumentEventName;
const {
  ACTOR_TYPE,
  RULE_PROCESSOR_CODE_VERSION,
  RULE_PROCESSOR_RESULT_CONTENT,
  RULE_PROCESSOR_SOURCE_CODE_URL,
  RULE_SLUG,
} = DocumentEventAttributeName;
const { MASS, METHODOLOGY } = DocumentCategory;
const { CERTIFICATE, CERTIFICATE_AUDIT, CREDIT_CERTIFICATES, MASS_VALIDATION } =
  DocumentType;

describe('NftMetadataSelection E2E', () => {
  const documentKeyPrefix = faker.string.uuid();
  const offerDocumentId = faker.string.uuid();

  // TODO: Refac this test to use a builder or a stub that prepares the documents https://app.clickup.com/t/86a36ut5a
  const offerDocumentReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: offerDocumentId,
    type: DocumentType.CREDIT,
  };
  const certificateAuditsReferences: DocumentReference[] = stubArray(
    () => ({
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      subtype: DocumentSubtype.PROCESS,
      type: CERTIFICATE_AUDIT,
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
  const massValidationsReferences: DocumentReference[] = stubArray(
    () => ({
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      type: MASS_VALIDATION,
    }),
    massesReferences.length,
  );
  const certificatesReferences: DocumentReference[] = stubArray(
    () => ({
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      type: CERTIFICATE,
    }),
    2,
  );
  const offerCertificatesReference: DocumentReference = {
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

  const offerDocumentStub = stubOfferDocument({
    externalEvents: [
      stubDocumentOutputEvent(offerCertificatesReference),
      stubDocumentEvent({
        name: LINK,
        relatedDocument: methodologyDefinitionReference,
      }),
    ],
    id: offerDocumentReference.documentId,
  });

  const offerCertificatesDocumentStub = stubOfferCertificatesDocument({
    externalEvents: certificateAuditsReferences.map((certificateAudit) =>
      stubDocumentRelatedEvent(certificateAudit),
    ),
    id: offerCertificatesReference.documentId,
    parentDocumentId: offerDocumentId,
  });

  const certificateAuditsDocumentsStubs = certificatesReferences.map(
    (certificate, index) =>
      stubCertificateAuditDocument({
        externalEvents: [
          stubDocumentRelatedEvent(offerCertificatesReference),
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
        id: certificateAuditsReferences[index]!.documentId,
        parentDocumentId: certificate.documentId,
      }),
  );

  const certificatesDocumentsStubs = certificatesReferences.map(
    (certificateReference, index) => {
      const firstFiveMassesValidations = massValidationsReferences.slice(0, 5);
      const lastFiveMassesValidations = massValidationsReferences.slice(5);

      return stubCertificateDocument({
        externalEvents: [
          ...(index === 0
            ? firstFiveMassesValidations.map((massValidationReference) =>
                stubDocumentRelatedEvent(massValidationReference),
              )
            : lastFiveMassesValidations.map((massValidationReference) =>
                stubDocumentRelatedEvent(massValidationReference),
              )),
          stubDocumentOutputEvent(certificateAuditsReferences[index]!),
        ],
        id: certificateReference.documentId,
      });
    },
  );

  const massValidationsDocumentStubs = massesReferences.map(
    (massReference, index) =>
      stubMassValidationDocument({
        externalEvents: [
          index < 5
            ? stubDocumentRelatedEvent(certificatesReferences[0]!)
            : stubDocumentRelatedEvent(certificatesReferences[1]!),
        ],
        id: massValidationsReferences[index]!.documentId,
        parentDocumentId: massReference.documentId,
      }),
  );

  const massesDocumentStubs = massesReferences.map((massReference, index) =>
    stubMassDocument({
      externalEvents: [
        stubDocumentOutputEvent(massValidationsReferences[index]!),
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
    offerDocumentStub,
    methodologyDefinitionDocumentStub,
    offerCertificatesDocumentStub,
    ...certificateAuditsDocumentsStubs,
    ...certificatesDocumentsStubs,
    ...massValidationsDocumentStubs,
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
        documentId: offerDocumentId,
        documentKeyPrefix,
      }),
      stubContext(),
      () => stubRuleResponse(),
    )) as RuleOutput;

    const validationResultContent = validate<NftMetadata>(
      response.resultContent,
    );

    expect(validationResultContent.errors).toEqual([]);
    expect(response.resultStatus).toEqual(RuleOutputStatus.APPROVED);
  });
});
