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
import { mergeEventsMaps } from './bold.builder.helpers';
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
  creditDocumentsStubs: Document[];
  massIdAuditDocumentStub: Document;
  massIdAuditId: string;
  massIdDocumentId: string;
  massIdDocumentStub: Document;
  methodologyDocumentStub?: Document | undefined;
  participantsHomologationDocumentStubs: Map<string, Document>;
}

const ACTOR_PARTICIPANTS = [
  MassIdDocumentActorType.HAULER,
  MassIdDocumentActorType.PROCESSOR,
  MassIdDocumentActorType.RECYCLER,
  MassIdDocumentActorType.WASTE_GENERATOR,
] as const;

export class BoldStubsBuilder {
  private readonly actorParticipants: Map<string, MethodologyParticipant>;

  private creditDocumentsStubs: Document[] = [];

  private creditReferences: DocumentReference[] = [];

  private readonly massAuditReference: DocumentReference;

  private readonly massIdAuditDocumentId: string;

  private massIdAuditDocumentStub: Document;

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
  }

  build(): BoldStubsBuilderResult {
    return {
      actorParticipants: this.actorParticipants,
      creditDocumentsStubs: this.creditDocumentsStubs,
      massIdAuditDocumentStub: this.massIdAuditDocumentStub,
      massIdAuditId: this.massIdAuditDocumentId,
      massIdDocumentId: this.massIdDocumentId,
      massIdDocumentStub: this.massIdDocumentStub,
      methodologyDocumentStub: this.methodologyDocumentStub,
      participantsHomologationDocumentStubs:
        this.participantsHomologationDocumentStubs,
    };
  }

  createMassIdAuditDocumentStub({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    if (isNil(this.massIdDocumentStub)) {
      throw new Error(
        'MassID document must be created first. Call createMassIdDocumentStub() before this method.',
      );
    }

    this.massIdAuditDocumentStub = stubBoldMassIdAuditDocument({
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
        currentValue: this.massIdDocumentStub.currentValue,
        id: this.massAuditReference.documentId,
        parentDocumentId: this.massIdDocumentStub.id,
      },
    });

    return this;
  }

  createMassIdDocumentStub({
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

    this.massIdDocumentStub = stubBoldMassIdDocument({
      externalEventsMap: mergeEventsMaps(defaultEventsMap, externalEventsMap),
      partialDocument: {
        ...partialDocument,
        id: this.massIdReference.documentId,
      },
    });

    return this;
  }

  createMethodologyDocuments(): BoldStubsBuilder {
    if (isNil(this.massIdDocumentStub) || isNil(this.massIdAuditDocumentStub)) {
      throw new Error(
        'MassID documents must be created first. Call createMassIdDocumentStub() and createMassIdAuditDocumentStub() before this method.',
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

    this.massIdAuditDocumentStub = {
      ...this.massIdAuditDocumentStub,
      externalEvents: [
        ...(this.massIdAuditDocumentStub.externalEvents ?? []),
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
      isNil(this.participantHomologationGroupDocumentStub)
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

      this.massIdAuditDocumentStub = {
        ...this.massIdAuditDocumentStub,
        externalEvents: [
          ...(this.massIdAuditDocumentStub.externalEvents ?? []),
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

    if (isNil(this.massIdDocumentStub)) {
      throw new Error(
        'MassID document must be created first. Call createMassIdDocumentStub() before this method.',
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
