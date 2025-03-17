import type { MethodologyParticipant } from '@carrot-fndn/shared/types';

import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  DocumentCategory,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
  MassIdDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import type { StubBoldDocumentParameters } from './bold.stubs.types';

import {
  stubCreditDocument,
  stubDocumentEvent,
  stubMethodologyDefinitionDocument,
  stubParticipant,
  stubParticipantHomologationGroupDocument,
} from '../stubs';
import { stubBoldMassIdDocument } from './bold-mass-id.stubs';
import { stubBoldMassIdAuditDocument } from './bold-mass-id-audit.stubs';
import { stubBoldHomologationDocument } from './bold-participant-homologation.stubs';

const { ACTOR, LINK, OUTPUT, RELATED } = DocumentEventName;
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
  creditDocuments: Document[];
  massIdAuditDocument: Document;
  massIdAuditId: string;
  massIdDocument: Document;
  massIdDocumentId: string;
  methodologyDocument?: Document | undefined;
  participantsHomologationDocuments: Map<string, Document>;
}

const ACTOR_PARTICIPANTS = [
  MassIdDocumentActorType.HAULER,
  MassIdDocumentActorType.PROCESSOR,
  MassIdDocumentActorType.RECYCLER,
  MassIdDocumentActorType.WASTE_GENERATOR,
] as const;

export class BoldStubsBuilder {
  private readonly actorParticipants: Map<string, MethodologyParticipant>;

  private creditDocuments: Document[] = [];

  private creditReferences: DocumentReference[] = [];

  private readonly massAuditReference: DocumentReference;

  private massIdAuditDocument: Document;

  private readonly massIdAuditDocumentId: string;

  private massIdDocument: Document;

  private readonly massIdDocumentId: string;

  private readonly massIdReference: DocumentReference;

  private methodologyDocument?: Document;

  private methodologyReference?: DocumentReference;

  private participantHomologationGroupDocument?: Document;

  private participantHomologationGroupReference?: DocumentReference;

  private participantsHomologationDocuments: Map<string, Document> = new Map();

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
  }

  build(): BoldStubsBuilderResult {
    return {
      actorParticipants: this.actorParticipants,
      creditDocuments: this.creditDocuments,
      massIdAuditDocument: this.massIdAuditDocument,
      massIdAuditId: this.massIdAuditDocumentId,
      massIdDocument: this.massIdDocument,
      massIdDocumentId: this.massIdDocumentId,
      methodologyDocument: this.methodologyDocument,
      participantsHomologationDocuments: this.participantsHomologationDocuments,
    };
  }

  createMassIdAuditDocument({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    if (isNil(this.massIdDocument)) {
      throw new Error(
        'MassID document must be created first. Call createMassIdDocument() before this method.',
      );
    }

    this.massIdAuditDocument = stubBoldMassIdAuditDocument({
      externalEventsMap: {
        [LINK]: stubDocumentEvent({
          name: LINK,
          referencedDocument: this.massIdReference,
          relatedDocument: undefined,
        }),
        ...externalEventsMap,
      },
      partialDocument: {
        ...partialDocument,
        currentValue: this.massIdDocument.currentValue,
        id: this.massAuditReference.documentId,
        parentDocumentId: this.massIdDocument.id,
      },
    });

    return this;
  }

  createMassIdDocument({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    const actorEvents = Object.fromEntries(
      Array.from(this.actorParticipants, ([actorType, participant]) => [
        `${ACTOR}-${actorType}`,
        stubDocumentEvent({
          label: actorType,
          name: ACTOR,
          participant,
        }),
      ]),
    );

    const defaultEventsMap = new Map([
      [
        OUTPUT,
        stubDocumentEvent({
          name: OUTPUT,
          relatedDocument: this.massAuditReference,
        }),
      ],
      ...Object.entries(actorEvents),
    ]);

    this.massIdDocument = stubBoldMassIdDocument({
      externalEventsMap: new Map([
        ...defaultEventsMap,
        ...(externalEventsMap instanceof Map
          ? externalEventsMap
          : Object.entries(externalEventsMap ?? {})),
      ]),
      partialDocument: {
        ...partialDocument,
        id: this.massIdReference.documentId,
      },
    });

    return this;
  }

  createMethodologyDocuments(): BoldStubsBuilder {
    if (isNil(this.massIdDocument) || isNil(this.massIdAuditDocument)) {
      throw new Error(
        'MassID documents must be created first. Call createMassIdDocument() and createMassIdAuditDocument() before this method.',
      );
    }

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

    this.participantHomologationGroupDocument =
      stubParticipantHomologationGroupDocument({
        id: this.participantHomologationGroupReference.documentId,
        parentDocumentId: this.methodologyReference.documentId,
      });

    this.methodologyDocument = stubMethodologyDefinitionDocument({
      externalEvents: [
        stubDocumentEvent({
          name: OUTPUT,
          relatedDocument: this.participantHomologationGroupReference,
        }),
      ],
      id: this.methodologyReference.documentId,
    });

    this.massIdAuditDocument = {
      ...this.massIdAuditDocument,
      externalEvents: [
        ...(this.massIdAuditDocument.externalEvents ?? []),
        stubDocumentEvent({
          name: LINK,
          referencedDocument: this.methodologyReference,
          relatedDocument: undefined,
        }),
      ],
    };

    return this;
  }

  createParticipantHomologationDocuments(
    homologationDocuments?: Map<
      (typeof ACTOR_PARTICIPANTS)[number],
      StubBoldDocumentParameters
    >,
  ): BoldStubsBuilder {
    if (
      isNil(this.methodologyReference) ||
      isNil(this.participantHomologationGroupReference) ||
      isNil(this.participantHomologationGroupDocument)
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

      const documentStub = stubBoldHomologationDocument({
        externalEventsMap:
          homologationDocuments?.get(subtype)?.externalEventsMap,
        partialDocument: {
          ...homologationDocuments?.get(subtype)?.partialDocument,
          id: reference.documentId,
          parentDocumentId:
            this.participantHomologationGroupReference.documentId,
          primaryParticipant: this.actorParticipants.get(subtype)!,
          subtype,
        },
      });

      this.participantsHomologationDocuments.set(subtype, documentStub);

      this.participantHomologationGroupDocument = {
        ...this.participantHomologationGroupDocument,
        externalEvents: [
          ...(this.participantHomologationGroupDocument.externalEvents ?? []),
          stubDocumentEvent({
            name: OUTPUT,
            relatedDocument: reference,
          }),
        ],
      };

      this.massIdAuditDocument = {
        ...this.massIdAuditDocument,
        externalEvents: [
          ...(this.massIdAuditDocument.externalEvents ?? []),
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

    if (isNil(this.massIdDocument)) {
      throw new Error(
        'MassID document must be created first. Call createMassIdDocument() before this method.',
      );
    }

    this.creditReferences = stubArray(
      () => ({
        category: METHODOLOGY,
        documentId: faker.string.uuid(),
        subtype: creditType,
        type: CREDIT,
      }),
      { max: creditCount },
    );

    this.creditDocuments = this.creditReferences.map((reference) =>
      stubCreditDocument({
        id: reference.documentId,
        subtype: reference.subtype,
      }),
    );

    this.massIdDocument = {
      ...this.massIdDocument,
      externalEvents: [
        ...(this.massIdDocument.externalEvents ?? []),
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
