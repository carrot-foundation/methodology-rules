import type {
  Geolocation,
  MethodologyAddress,
  MethodologyParticipant,
} from '@carrot-fndn/shared/types';

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
  generateNearbyCoordinates,
  stubAddress,
  stubCreditDocument,
  stubDocumentEvent,
  stubMethodologyDefinitionDocument,
  stubParticipant,
  stubParticipantHomologationGroupDocument,
} from '../stubs';
import {
  stubBoldMassIdDocument,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdPickUpEvent,
} from './bold-mass-id.stubs';
import { stubBoldMassIdAuditDocument } from './bold-mass-id-audit.stubs';
import { stubBoldHomologationDocument } from './bold-participant-homologation.stubs';

const { ACTOR, DROP_OFF, LINK, OPEN, OUTPUT, PICK_UP, RELATED } =
  DocumentEventName;
const { MASS_ID, METHODOLOGY } = DocumentCategory;
const { CREDIT, DEFINITION, MASS_ID_AUDIT, ORGANIC, PARTICIPANT_HOMOLOGATION } =
  DocumentType;
const { FOOD_WASTE, GROUP, PROCESS, TCC, TRC } = DocumentSubtype;

export interface BoldStubsBuilderOptions {
  actorParticipants?: Map<string, MethodologyParticipant> | undefined;
  massIdAuditDocumentId?: string;
  massIdDocumentId?: string;
}

export interface BoldStubsBuilderResult {
  actorParticipants: Map<string, MethodologyParticipant>;
  actorParticipantsAddresses: Map<string, MethodologyAddress>;
  creditDocuments: Document[];
  creditDocumentsStubs: Document[];
  massIdAuditDocument: Document;
  massIdAuditId: string;
  massIdDocument: Document;
  massIdDocumentId: string;
  methodologyDocument?: Document | undefined;
  participantsHomologationDocuments: Map<string, Document>;
}

export const ACTOR_PARTICIPANTS = [
  MassIdDocumentActorType.HAULER,
  MassIdDocumentActorType.PROCESSOR,
  MassIdDocumentActorType.RECYCLER,
  MassIdDocumentActorType.WASTE_GENERATOR,
] as const;

export class BoldStubsBuilder {
  private readonly actorParticipants: Map<string, MethodologyParticipant>;

  private readonly actorParticipantsAddresses: Map<string, MethodologyAddress>;

  private readonly actorsCoordinates: Map<
    string,
    { base: Geolocation; nearby: Geolocation }
  >;

  private creditDocuments: Document[] = [];

  private creditDocumentsStubs: Document[] = [];

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

    this.actorParticipants =
      options.actorParticipants ??
      new Map(
        ACTOR_PARTICIPANTS.map((subtype) => [
          subtype,
          stubParticipant({ type: subtype }),
        ]),
      );

    this.actorsCoordinates = new Map(
      ACTOR_PARTICIPANTS.map((subtype) => [
        subtype,
        generateNearbyCoordinates(),
      ]),
    );

    this.actorParticipantsAddresses = new Map(
      ACTOR_PARTICIPANTS.map((subtype) => {
        const coords = this.actorsCoordinates.get(subtype)!.base;
        const address = stubAddress();

        return [
          subtype,
          {
            ...address,
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        ];
      }),
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
      actorParticipantsAddresses: this.actorParticipantsAddresses,
      creditDocuments: this.creditDocuments,
      creditDocumentsStubs: this.creditDocumentsStubs,
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
          address: this.actorParticipantsAddresses.get(actorType)!,
          label: actorType,
          name: ACTOR,
          participant,
        }),
      ]),
    );

    const defaultEventsMap = new Map([
      [
        DROP_OFF,
        stubBoldMassIdDropOffEvent({
          partialDocumentEvent: {
            address: this.actorParticipantsAddresses.get(
              MassIdDocumentActorType.RECYCLER,
            )!,
            participant: this.actorParticipants.get(
              MassIdDocumentActorType.RECYCLER,
            )!,
          },
        }),
      ],
      [
        OUTPUT,
        stubDocumentEvent({
          name: OUTPUT,
          relatedDocument: this.massAuditReference,
        }),
      ],
      [
        PICK_UP,
        stubBoldMassIdPickUpEvent({
          partialDocumentEvent: {
            address: this.actorParticipantsAddresses.get(
              MassIdDocumentActorType.WASTE_GENERATOR,
            )!,
            participant: this.actorParticipants.get(
              MassIdDocumentActorType.WASTE_GENERATOR,
            )!,
          },
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
    homologationDocuments?: Map<string, StubBoldDocumentParameters> | undefined,
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

      const primaryAddress = this.actorParticipantsAddresses.get(subtype)!;
      const primaryParticipant = this.actorParticipants.get(subtype)!;
      const defaultEventsMap = new Map([
        [
          OPEN,
          stubDocumentEvent({
            address: primaryAddress,
            name: OPEN,
            participant: primaryParticipant,
          }),
        ],
      ]);
      const externalEventsMap =
        homologationDocuments?.get(subtype)?.externalEventsMap;

      const documentStub = stubBoldHomologationDocument({
        externalEventsMap: new Map([
          ...defaultEventsMap,
          ...(externalEventsMap instanceof Map
            ? externalEventsMap
            : Object.entries(externalEventsMap ?? {})),
        ]),
        partialDocument: {
          id: reference.documentId,
          parentDocumentId:
            this.participantHomologationGroupReference.documentId,
          primaryAddress,
          primaryParticipant,
          subtype,
        },
      });

      this.participantHomologationGroupDocument = {
        ...this.participantHomologationGroupDocument,
        externalEvents: [
          ...(this.participantHomologationGroupDocument.externalEvents ?? []),
          stubDocumentEvent({
            address: primaryAddress,
            name: OUTPUT,
            participant: primaryParticipant,
            relatedDocument: reference,
          }),
        ],
      };

      this.massIdAuditDocument = {
        ...this.massIdAuditDocument,
        externalEvents: [
          ...(this.massIdAuditDocument.externalEvents ?? []),
          stubDocumentEvent({
            address: primaryAddress,
            name: LINK,
            participant: primaryParticipant,
            referencedDocument: reference,
            relatedDocument: undefined,
          }),
        ],
      };

      this.participantsHomologationReferences.set(subtype, reference);
      this.participantsHomologationDocuments.set(subtype, documentStub);
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
