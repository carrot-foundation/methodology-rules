import type { MethodologyParticipant } from '@carrot-fndn/shared/types';

import {
  type Document,
  DocumentCategory,
  DocumentEventAttributeName,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
  MassSubtype,
  NewMeasurementUnit,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray, stubEnumValue } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';
import { addDays, formatDate, subDays } from 'date-fns';

import {
  stubCreditDocument,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubMassAuditDocument,
  stubMassDocument,
  stubMethodologyDefinitionDocument,
  stubParticipant,
  stubParticipantHomologationDocument,
  stubParticipantHomologationGroupDocument,
} from '../stubs';

const { ACTOR, CLOSE, LINK, OUTPUT, RELATED } = DocumentEventName;
const { HOMOLOGATION_DATE, HOMOLOGATION_DUE_DATE } = DocumentEventAttributeName;
const { MASS_ID, METHODOLOGY } = DocumentCategory;
const { CREDIT, DEFINITION, MASS_ID_AUDIT, ORGANIC, PARTICIPANT_HOMOLOGATION } =
  DocumentType;
const { FOOD_WASTE, GROUP, PROCESS, TCC, TRC } = DocumentSubtype;

export interface BoldStubsBuilderOptions {
  massIdAuditDocumentId?: string;
  massIdDocumentId?: string;
}

export interface BoldStubsBuilderResult {
  actorParticipants: Map<string, MethodologyParticipant>;
  creditDocumentsStubs: Document[];
  massIdAuditDocumentStub: Document;
  massIdAuditId: string;
  massIdDocumentId: string;
  massIdDocumentStub: Document;
  methodologyDocumentStub?: Document | undefined;
  participantsHomologationDocumentStubs: Map<string, Document>;
}

const ACTOR_PARTICIPANTS = [
  DocumentSubtype.HAULER,
  DocumentSubtype.PROCESSOR,
  DocumentSubtype.RECYCLER,
  DocumentSubtype.WASTE_GENERATOR,
] as const;

export class BoldStubsBuilder {
  private readonly actorParticipants: Map<string, MethodologyParticipant>;

  private creditDocumentsStubs: Document[] = [];

  private creditReferences: DocumentReference[] = [];

  private massAuditDocumentStub: Document;

  private readonly massAuditReference: DocumentReference;

  private readonly massIdAuditDocumentId: string;

  private readonly massIdDocumentId: string;

  private massIdDocumentStub: Document;

  private readonly massIdReference: DocumentReference;

  private methodologyDocumentStub?: Document;

  private methodologyReference?: DocumentReference;

  private participantHomologationGroupDocumentStub?: Document;

  private participantHomologationGroupReference?: DocumentReference;

  private participantsHomologationDocumentStubs: Map<string, Document> =
    new Map();

  private participantsHomologationReferences: Map<string, DocumentReference> =
    new Map();

  constructor(options: BoldStubsBuilderOptions = {}) {
    this.massIdDocumentId = options.massIdDocumentId ?? faker.string.uuid();
    this.massIdAuditDocumentId =
      options.massIdAuditDocumentId ?? faker.string.uuid();

    this.actorParticipants = new Map(
      ACTOR_PARTICIPANTS.map((subtype) => [
        subtype,
        stubParticipant({ id: faker.string.uuid() }),
      ]),
    );

    this.massIdReference = {
      category: MASS_ID,
      documentId: this.massIdDocumentId,
      subtype: FOOD_WASTE,
      type: ORGANIC,
    };

    this.massAuditReference = {
      category: METHODOLOGY,
      documentId: this.massIdAuditDocumentId,
      subtype: PROCESS,
      type: MASS_ID_AUDIT,
    };

    this.massIdDocumentStub = this.createMassIdDocumentStub();
    this.massAuditDocumentStub = this.createMassAuditDocumentStub();
  }

  private createMassAuditDocumentStub(): Document {
    return stubMassAuditDocument({
      externalEvents: [
        stubDocumentEvent({
          name: LINK,
          referencedDocument: this.massIdReference,
          relatedDocument: undefined,
        }),
      ],
      id: this.massAuditReference.documentId,
      parentDocumentId: this.massIdDocumentStub.id,
    });
  }

  private createMassIdDocumentStub(): Document {
    return stubMassDocument({
      category: DocumentCategory.MASS_ID,
      currentValue: faker.number.float({ min: 1 }),
      externalEvents: [
        ...Array.from(this.actorParticipants, ([, participant]) =>
          stubDocumentEvent({ name: ACTOR, participant }),
        ),
        stubDocumentEvent({
          name: OUTPUT,
          relatedDocument: this.massAuditReference,
        }),
      ],
      id: this.massIdReference.documentId,
      measurementUnit: NewMeasurementUnit.KG,
      subtype: stubEnumValue(MassSubtype),
      type: DocumentType.ORGANIC,
    });
  }

  build(): BoldStubsBuilderResult {
    return {
      actorParticipants: this.actorParticipants,
      creditDocumentsStubs: this.creditDocumentsStubs,
      massIdAuditDocumentStub: this.massAuditDocumentStub,
      massIdAuditId: this.massIdAuditDocumentId,
      massIdDocumentId: this.massIdDocumentId,
      massIdDocumentStub: this.massIdDocumentStub,
      methodologyDocumentStub: this.methodologyDocumentStub,
      participantsHomologationDocumentStubs:
        this.participantsHomologationDocumentStubs,
    };
  }

  createMethodologyDocuments(): BoldStubsBuilder {
    this.methodologyReference = {
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      type: DEFINITION,
    };

    this.participantHomologationGroupReference = {
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      subtype: GROUP,
      type: PARTICIPANT_HOMOLOGATION,
    };

    this.participantHomologationGroupDocumentStub =
      stubParticipantHomologationGroupDocument({
        id: this.participantHomologationGroupReference.documentId,
        parentDocumentId: this.methodologyReference.documentId,
      });

    this.methodologyDocumentStub = stubMethodologyDefinitionDocument({
      externalEvents: [
        stubDocumentEvent({
          name: OUTPUT,
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
          name: LINK,
          referencedDocument: this.methodologyReference,
          relatedDocument: undefined,
        }),
      ],
    };

    return this;
  }

  createParticipantHomologationDocuments(): BoldStubsBuilder {
    if (
      !this.methodologyReference ||
      !this.participantHomologationGroupReference ||
      !this.participantHomologationGroupDocumentStub
    ) {
      throw new Error(
        'Methodology documents must be created first. Call createMethodologyDocuments() before this method.',
      );
    }

    for (const subtype of ACTOR_PARTICIPANTS) {
      const reference: DocumentReference = {
        category: METHODOLOGY,
        documentId: faker.string.uuid(),
        subtype,
        type: PARTICIPANT_HOMOLOGATION,
      };

      this.participantsHomologationReferences.set(subtype, reference);

      const documentStub = stubParticipantHomologationDocument({
        externalEvents: [
          stubDocumentEventWithMetadataAttributes({ name: CLOSE }, [
            [
              HOMOLOGATION_DATE,
              formatDate(subDays(new Date(), 2), 'yyyy-MM-dd'),
            ],
            [
              HOMOLOGATION_DUE_DATE,
              formatDate(addDays(new Date(), 2), 'yyyy-MM-dd'),
            ],
          ]),
        ],
        id: reference.documentId,
        parentDocumentId: this.participantHomologationGroupReference.documentId,
        primaryParticipant: this.actorParticipants.get(subtype)!,
        subtype,
      });

      this.participantsHomologationDocumentStubs.set(subtype, documentStub);

      this.participantHomologationGroupDocumentStub = {
        ...this.participantHomologationGroupDocumentStub,
        externalEvents: [
          ...(this.participantHomologationGroupDocumentStub.externalEvents ??
            []),
          stubDocumentEvent({
            name: OUTPUT,
            relatedDocument: reference,
          }),
        ],
      };

      this.massAuditDocumentStub = {
        ...this.massAuditDocumentStub,
        externalEvents: [
          ...(this.massAuditDocumentStub.externalEvents ?? []),
          stubDocumentEvent({
            name: LINK,
            referencedDocument: reference,
            relatedDocument: undefined,
          }),
        ],
      };
    }

    return this;
  }

  withCredits({
    count = 1,
    creditType = TRC,
  }: {
    count?: number;
    creditType?: typeof TCC | typeof TRC;
  } = {}): BoldStubsBuilder {
    const creditCount = Math.max(1, count);

    this.creditReferences = stubArray(
      () => ({
        category: METHODOLOGY,
        documentId: faker.string.uuid(),
        subtype: creditType,
        type: CREDIT,
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
            name: RELATED,
            relatedDocument: reference,
          }),
        ),
      ],
    };

    return this;
  }
}
