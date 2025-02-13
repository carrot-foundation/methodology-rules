import type { RuleInput } from '@carrot-fndn/shared/rule/types';
import type { UnknownObject } from '@carrot-fndn/shared/types';

import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/methodologies/bold/recycling/organic/io-helpers';
import {
  stubDocument,
  stubDocumentEventWithMetadataAttributes,
} from '@carrot-fndn/methodologies/bold/recycling/organic/testing';
import { DocumentEventName } from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import {
  DocumentCategory,
  DocumentEventActorType,
  DocumentEventAttributeName,
  DocumentEventRuleSlug,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
  type RewardDistributionResultContent,
} from '@carrot-fndn/methodologies/bold/recycling/organic/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random, validate } from 'typia';

import type { NftMetadata } from './nft-metadata-selection.types';

import { NftMetadataSelection } from './nft-metadata-selection.processor';
import {
  stubCreditCertificatesDocument,
  stubDocumentOutputEvent,
  stubDocumentRelatedEvent,
  stubMassAuditDocument,
  stubMassCertificateAuditDocument,
  stubMassCertificateDocument,
  stubMassDocument,
  stubMethodologyDefinitionDocument,
} from './nft-metadata-selection.stubs';

const {
  ACTOR_TYPE,
  COLLECTION_NAME,
  NFT_DESCRIPTION,
  RULE_PROCESSOR_CODE_VERSION,
  RULE_PROCESSOR_RESULT_CONTENT,
  RULE_PROCESSOR_SOURCE_CODE_URL,
  RULE_SLUG,
  STORE_CONTRACT_ADDRESS: STORE_SMART_CONTRACT_ADDRESS,
} = DocumentEventAttributeName;
const { ACTOR, RULE_EXECUTION, RULES_METADATA } = DocumentEventName;
const { RECYCLER } = DocumentEventActorType;
const { REWARDS_DISTRIBUTION } = DocumentEventRuleSlug;

describe('NftMetadataSelection', () => {
  const ruleDataProcessor = new NftMetadataSelection();

  const creditDocumentId = faker.string.uuid();

  const creditCertificatesReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    subtype: DocumentSubtype.GROUP,
    type: DocumentType.CREDIT_CERTIFICATES,
  };

  const creditDocumentStub = stubDocument({
    externalEvents: [
      stubDocumentEventWithMetadataAttributes({ name: RULES_METADATA }, [
        [COLLECTION_NAME, faker.lorem.word()],
        [NFT_DESCRIPTION, faker.lorem.sentence()],
        [STORE_SMART_CONTRACT_ADDRESS, faker.finance.ethereumAddress()],
      ]),
    ],
    id: creditDocumentId,
  });

  it('should return the rule output with the extracted NFT metadata', async () => {
    const massCertificateAuditReference: DocumentReference = {
      category: DocumentCategory.METHODOLOGY,
      documentId: faker.string.uuid(),
      subtype: DocumentSubtype.PROCESS,
      type: DocumentType.MASS_CERTIFICATE_AUDIT,
    };
    const massCertificateReference: DocumentReference = {
      category: DocumentCategory.METHODOLOGY,
      documentId: faker.string.uuid(),
      type: DocumentType.MASS_CERTIFICATE,
    };
    const massAuditReference: DocumentReference = {
      category: DocumentCategory.METHODOLOGY,
      documentId: faker.string.uuid(),
      type: DocumentType.MASS_AUDIT,
    };
    const massReference: DocumentReference = {
      category: DocumentCategory.MASS,
      documentId: faker.string.uuid(),
    };

    const creditCertificatesDocumentStub = stubCreditCertificatesDocument({
      externalEvents: [stubDocumentRelatedEvent(massCertificateAuditReference)],
      id: creditCertificatesReference.documentId,
      parentDocumentId: creditDocumentId,
    });
    const massCertificateAuditDocumentStub = stubMassCertificateAuditDocument({
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
      id: massCertificateAuditReference.documentId,
      parentDocumentId: massCertificateReference.documentId,
    });
    const massCertificateDocumentStub = stubMassCertificateDocument({
      externalEvents: [
        stubDocumentRelatedEvent(massAuditReference),
        stubDocumentOutputEvent(massCertificateAuditReference),
      ],
      id: massCertificateReference.documentId,
    });
    const massAuditDocumentStub = stubMassAuditDocument({
      externalEvents: [stubDocumentRelatedEvent(massCertificateReference)],
      id: massAuditReference.documentId,
      parentDocumentId: massReference.documentId,
    });
    const massDocumentStub = stubMassDocument({
      externalEvents: [
        stubDocumentOutputEvent(massAuditReference),
        stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
          [ACTOR_TYPE, RECYCLER],
        ]),
      ],
      id: massReference.documentId,
    });

    const documents = [
      stubMethodologyDefinitionDocument(),
      creditCertificatesDocumentStub,
      massCertificateAuditDocumentStub,
      massCertificateDocumentStub,
      massAuditDocumentStub,
      massDocumentStub,
    ];

    spyOnDocumentQueryServiceLoad(creditDocumentStub, documents);

    const result = await ruleDataProcessor.process({
      ...random<RuleInput>(),
      documentId: creditDocumentId,
    });

    const validation = validate<NftMetadata>(result.resultContent);

    expect(validation).toPassTypiaValidation();
  });

  it('should return the resultContent with a greater amount of massCertificates and masses', async () => {
    const massCertificateAuditsReferences: DocumentReference[] = stubArray(
      () => ({
        category: DocumentCategory.METHODOLOGY,
        documentId: faker.string.uuid(),
        subtype: DocumentSubtype.PROCESS,
        type: DocumentType.MASS_CERTIFICATE_AUDIT,
      }),
      2,
    );
    const massesReferences: DocumentReference[] = stubArray(
      () => ({
        category: DocumentCategory.MASS,
        documentId: faker.string.uuid(),
      }),
      10,
    );
    const massAuditsReferences: DocumentReference[] = stubArray(
      () => ({
        category: DocumentCategory.METHODOLOGY,
        documentId: faker.string.uuid(),
        type: DocumentType.MASS_AUDIT,
      }),
      massesReferences.length,
    );
    const massCertificatesReferences: DocumentReference[] = stubArray(
      () => ({
        category: DocumentCategory.METHODOLOGY,
        documentId: faker.string.uuid(),
        type: DocumentType.MASS_CERTIFICATE,
      }),
      2,
    );

    const creditCertificatesDocumentsStub = stubCreditCertificatesDocument({
      externalEvents: massCertificateAuditsReferences.map(
        (massCertificateAudit) =>
          stubDocumentRelatedEvent(massCertificateAudit),
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

    const massAuditsDocumentStubs = massesReferences.map(
      (massReference, index) =>
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

    spyOnDocumentQueryServiceLoad(creditDocumentStub, [
      stubMethodologyDefinitionDocument(),
      creditCertificatesDocumentsStub,
      ...massCertificateAuditsDocumentsStubs,
      ...massCertificatesDocumentsStubs,
      ...massAuditsDocumentStubs,
      ...massesDocumentStubs,
    ]);

    const result = await ruleDataProcessor.process({
      ...random<RuleInput>(),
      documentId: creditDocumentId,
    });

    const resultContent = result.resultContent as NftMetadata;

    expect(resultContent.details.massCertificates.count).toBe(
      massCertificatesReferences.length,
    );
    expect(resultContent.details.massCertificates.documents.length).toBe(
      massCertificatesReferences.length,
    );
    expect(
      resultContent.details.massCertificates.documents[0].mass_ids,
    ).toHaveLength(5);
  });
});
