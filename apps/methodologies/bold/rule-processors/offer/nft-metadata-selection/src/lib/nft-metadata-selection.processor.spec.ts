import type { RuleInput } from '@carrot-fndn/shared/rule/types';
import type { UnknownObject } from '@carrot-fndn/shared/types';

import { spyOnDocumentQueryServiceLoad } from '@carrot-fndn/methodologies/bold/io-helpers';
import { stubDocumentEventWithMetadataAttributes } from '@carrot-fndn/methodologies/bold/testing';
import {
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
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { random, validate } from 'typia';

import type { NftMetadata } from './nft-metadata-selection.types';

import { NftMetadataSelection } from './nft-metadata-selection.processor';
import {
  stubCertificateAuditDocument,
  stubCertificateDocument,
  stubDocumentOutputEvent,
  stubDocumentRelatedEvent,
  stubMassDocument,
  stubMassValidationDocument,
  stubMethodologyDefinitionDocument,
  stubOfferCertificatesDocument,
} from './nft-metadata-selection.stubs';

const {
  ACTOR_TYPE,
  RULE_PROCESSOR_CODE_VERSION,
  RULE_PROCESSOR_RESULT_CONTENT,
  RULE_PROCESSOR_SOURCE_CODE_URL,
  RULE_SLUG,
} = DocumentEventAttributeName;
const { ACTOR, RULE_EXECUTION } = DocumentEventName;
const { RECYCLER } = DocumentEventActorType;
const { REWARDS_DISTRIBUTION } = DocumentEventRuleSlug;

describe('NftMetadataSelection', () => {
  const ruleDataProcessor = new NftMetadataSelection();

  const offerDocumentId = faker.string.uuid();

  const offerCertificatesReference: DocumentReference = {
    category: DocumentCategory.METHODOLOGY,
    documentId: faker.string.uuid(),
    subtype: DocumentSubtype.GROUP,
    type: DocumentType.CREDIT_CERTIFICATES,
  };

  it('should return the rule output with the extracted NFT metadata', async () => {
    const certificateAuditReference: DocumentReference = {
      category: DocumentCategory.METHODOLOGY,
      documentId: faker.string.uuid(),
      subtype: DocumentSubtype.PROCESS,
      type: DocumentType.CERTIFICATE_AUDIT,
    };
    const certificateReference: DocumentReference = {
      category: DocumentCategory.METHODOLOGY,
      documentId: faker.string.uuid(),
      type: DocumentType.CERTIFICATE,
    };
    const massValidationReference: DocumentReference = {
      category: DocumentCategory.METHODOLOGY,
      documentId: faker.string.uuid(),
      type: DocumentType.MASS_VALIDATION,
    };
    const massReference: DocumentReference = {
      category: DocumentCategory.MASS,
      documentId: faker.string.uuid(),
    };

    const offerCertificatesDocumentStub = stubOfferCertificatesDocument({
      externalEvents: [stubDocumentRelatedEvent(certificateAuditReference)],
      id: offerCertificatesReference.documentId,
      parentDocumentId: offerDocumentId,
    });
    const certificateAuditDocumentStub = stubCertificateAuditDocument({
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
      id: certificateAuditReference.documentId,
      parentDocumentId: certificateReference.documentId,
    });
    const certificateDocumentStub = stubCertificateDocument({
      externalEvents: [
        stubDocumentRelatedEvent(massValidationReference),
        stubDocumentOutputEvent(certificateAuditReference),
      ],
      id: certificateReference.documentId,
    });
    const massValidationDocumentStub = stubMassValidationDocument({
      externalEvents: [stubDocumentRelatedEvent(certificateReference)],
      id: massValidationReference.documentId,
      parentDocumentId: massReference.documentId,
    });
    const massDocumentStub = stubMassDocument({
      externalEvents: [
        stubDocumentOutputEvent(massValidationReference),
        stubDocumentEventWithMetadataAttributes({ name: ACTOR }, [
          [ACTOR_TYPE, RECYCLER],
        ]),
      ],
      id: massReference.documentId,
    });

    const documents = [
      stubMethodologyDefinitionDocument(),
      offerCertificatesDocumentStub,
      certificateAuditDocumentStub,
      certificateDocumentStub,
      massValidationDocumentStub,
      massDocumentStub,
    ];

    spyOnDocumentQueryServiceLoad(documents);

    const result = await ruleDataProcessor.process({
      ...random<RuleInput>(),
      documentId: offerDocumentId,
    });

    const validation = validate<NftMetadata>(result.resultContent);

    expect(validation.errors).toEqual([]);
  });

  it('should return the resultContent with a greater amount of certificates and masses', async () => {
    const certificateAuditsReferences: DocumentReference[] = stubArray(
      () => ({
        category: DocumentCategory.METHODOLOGY,
        documentId: faker.string.uuid(),
        subtype: DocumentSubtype.PROCESS,
        type: DocumentType.CERTIFICATE_AUDIT,
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
    const massValidationsReferences: DocumentReference[] = stubArray(
      () => ({
        category: DocumentCategory.METHODOLOGY,
        documentId: faker.string.uuid(),
        type: DocumentType.MASS_VALIDATION,
      }),
      massesReferences.length,
    );
    const certificatesReferences: DocumentReference[] = stubArray(
      () => ({
        category: DocumentCategory.METHODOLOGY,
        documentId: faker.string.uuid(),
        type: DocumentType.CERTIFICATE,
      }),
      2,
    );

    const offerCertificatesDocumentsStub = stubOfferCertificatesDocument({
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
        const firstFiveMassesValidations = massValidationsReferences.slice(
          0,
          5,
        );
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

    spyOnDocumentQueryServiceLoad([
      stubMethodologyDefinitionDocument(),
      offerCertificatesDocumentsStub,
      ...certificateAuditsDocumentsStubs,
      ...certificatesDocumentsStubs,
      ...massValidationsDocumentStubs,
      ...massesDocumentStubs,
    ]);

    const result = await ruleDataProcessor.process({
      ...random<RuleInput>(),
      documentId: offerDocumentId,
    });

    const resultContent = result.resultContent as NftMetadata;

    expect(resultContent.details.certificates.count).toBe(
      certificatesReferences.length,
    );
    expect(resultContent.details.certificates.documents.length).toBe(
      certificatesReferences.length,
    );
    expect(
      resultContent.details.certificates.documents[0].mass_ids,
    ).toHaveLength(5);
  });
});
