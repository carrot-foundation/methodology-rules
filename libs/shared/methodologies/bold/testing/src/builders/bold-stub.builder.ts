import type { NonEmptyArray } from '@carrot-fndn/shared/types';

import {
  type Document,
  DocumentCategory,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import {
  stubCreditDocument,
  stubDocumentEvent,
  stubMassAuditDocument,
  stubMassDocument,
  stubMethodologyDefinitionDocument,
  stubParticipantHomologationDocument,
  stubParticipantHomologationGroupDocument,
} from '../stubs';

export interface BoldStubsBuilderOptions {
  massIdAuditDocumentId?: string;
  massIdDocumentId?: string;
}

export interface BoldStubsBuilderResult {
  baseDocuments: Document[];
  creditDocumentsStubs: Document[];
  massIdAuditDocumentStub: Document;
  massIdAuditId: string;
  massIdDocumentId: string;
  massIdDocumentStub: Document;
  methodologyDocumentStub?: Document;
}

export class BoldStubsBuilder {
  private creditDocumentsStubs: Document[] = [];

  private creditReferences: DocumentReference[] = [];

  private massAuditDocumentStub: Document;

  private massAuditReference: DocumentReference;

  private massIdAuditDocumentId: string;

  private massIdDocumentId: string;

  private massIdDocumentStub: Document;

  private massIdReference: DocumentReference;

  private methodologyDocumentStub: Document;

  private methodologyDocumentsCreated = false;

  private methodologyReference: DocumentReference;

  private participantHomologationGroupDocumentStub: Document;

  private participantHomologationGroupReference: DocumentReference;

  private participantsHomologationDocumentStubs: Map<string, Document> =
    new Map();

  private participantsHomologationReferences: Map<string, DocumentReference> =
    new Map();

  constructor(options: BoldStubsBuilderOptions = {}) {
    this.massIdDocumentId = options.massIdDocumentId ?? faker.string.uuid();
    this.massIdAuditDocumentId =
      options.massIdAuditDocumentId ?? faker.string.uuid();

    this.massIdReference = {
      category: DocumentCategory.MASS_ID,
      documentId: this.massIdDocumentId,
      subtype: DocumentSubtype.FOOD_WASTE,
      type: DocumentType.ORGANIC,
    };

    this.massAuditReference = {
      category: DocumentCategory.METHODOLOGY,
      documentId: this.massIdAuditDocumentId,
      subtype: DocumentSubtype.PROCESS,
      type: DocumentType.MASS_ID_AUDIT,
    };

    this.massIdDocumentStub = stubMassDocument({
      externalEvents: [
        stubDocumentEvent({
          name: DocumentEventName.OUTPUT,
          relatedDocument: this.massAuditReference,
        }),
      ],
      id: this.massIdReference.documentId,
    });

    this.massAuditDocumentStub = stubMassAuditDocument({
      externalEvents: [
        stubDocumentEvent({
          name: DocumentEventName.LINK,
          referencedDocument: this.massIdReference,
          relatedDocument: undefined,
        }),
      ],
      id: this.massAuditReference.documentId,
      parentDocumentId: this.massIdDocumentStub.id,
    });
  }

  build(): BoldStubsBuilderResult {
    const result: BoldStubsBuilderResult = {
      baseDocuments: [this.massAuditDocumentStub, this.massIdDocumentStub],
      creditDocumentsStubs: this.creditDocumentsStubs,
      massIdAuditDocumentStub: this.massAuditDocumentStub,
      massIdAuditId: this.massIdAuditDocumentId,
      massIdDocumentId: this.massIdDocumentId,
      massIdDocumentStub: this.massIdDocumentStub,
      methodologyDocumentStub: this.methodologyDocumentStub,
    };

    return result;
  }

  createMethodologyDocuments(): BoldStubsBuilder {
    this.methodologyReference = {
      category: DocumentCategory.METHODOLOGY,
      documentId: faker.string.uuid(),
      type: DocumentType.DEFINITION,
    };

    this.participantHomologationGroupReference = {
      category: DocumentCategory.METHODOLOGY,
      documentId: faker.string.uuid(),
      subtype: DocumentSubtype.GROUP,
      type: DocumentType.PARTICIPANT_HOMOLOGATION,
    };

    this.participantHomologationGroupDocumentStub =
      stubParticipantHomologationGroupDocument({
        id: this.participantHomologationGroupReference.documentId,
        parentDocumentId: this.methodologyReference.documentId,
      });

    this.methodologyDocumentStub = stubMethodologyDefinitionDocument({
      externalEvents: [
        stubDocumentEvent({
          name: DocumentEventName.OUTPUT,
          relatedDocument: this.participantHomologationGroupReference,
        }),
      ],
      id: this.methodologyReference.documentId,
    });

    this.massAuditDocumentStub = {
      ...this.massAuditDocumentStub,
      externalEvents: [
        ...(this.massAuditDocumentStub.externalEvents ?? []),
        stubDocumentEvent({
          name: DocumentEventName.LINK,
          referencedDocument: this.methodologyReference,
          relatedDocument: undefined,
        }),
      ],
    };

    this.methodologyDocumentsCreated = true;

    return this;
  }

  createParticipantHomologationDocuments(
    homologationSubtypes: NonEmptyArray<DocumentSubtype>,
  ): BoldStubsBuilder {
    if (!this.methodologyDocumentsCreated) {
      throw new Error(
        'Methodology documents must be created first. Call createMethodologyDocuments() before this method.',
      );
    }

    for (const subtype of homologationSubtypes) {
      this.participantsHomologationReferences.set(subtype, {
        category: DocumentCategory.METHODOLOGY,
        documentId: faker.string.uuid(),
        subtype,
        type: DocumentType.PARTICIPANT_HOMOLOGATION,
      });

      this.participantsHomologationDocumentStubs.set(
        subtype,
        stubParticipantHomologationDocument({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          id: this.participantsHomologationReferences.get(subtype)!.documentId,
          parentDocumentId:
            this.participantHomologationGroupReference.documentId,
        }),
      );

      this.participantHomologationGroupDocumentStub = {
        ...this.participantHomologationGroupDocumentStub,
        externalEvents: [
          ...(this.participantHomologationGroupDocumentStub.externalEvents ??
            []),
          stubDocumentEvent({
            name: DocumentEventName.OUTPUT,
            relatedDocument:
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              this.participantsHomologationReferences.get(subtype)!,
          }),
        ],
      };

      this.massAuditDocumentStub = {
        ...this.massAuditDocumentStub,
        externalEvents: [
          ...(this.massAuditDocumentStub.externalEvents ?? []),
          stubDocumentEvent({
            name: DocumentEventName.LINK,
            referencedDocument:
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              this.participantsHomologationReferences.get(subtype)!,
            relatedDocument: undefined,
          }),
        ],
      };
    }

    return this;
  }

  withCredits({
    count = 1,
    creditType = DocumentSubtype.TRC,
  }: {
    count?: number;
    creditType?: DocumentSubtype.TCC | DocumentSubtype.TRC;
  } = {}): BoldStubsBuilder {
    const creditCount = Math.max(1, count);

    this.creditReferences = stubArray(
      () => ({
        category: DocumentCategory.METHODOLOGY,
        documentId: faker.string.uuid(),
        subtype: creditType,
        type: DocumentType.CREDIT,
      }),
      { max: creditCount },
    );

    this.creditDocumentsStubs = this.creditReferences.map((reference) =>
      stubCreditDocument({
        id: reference.documentId,
        subtype: reference.subtype,
      }),
    );

    this.massIdDocumentStub = {
      ...this.massIdDocumentStub,
      externalEvents: [
        ...(this.massIdDocumentStub.externalEvents ?? []),
        ...this.creditReferences.map((reference) =>
          stubDocumentEvent({
            name: DocumentEventName.RELATED,
            relatedDocument: reference,
          }),
        ),
      ],
    };

    return this;
  }
}
