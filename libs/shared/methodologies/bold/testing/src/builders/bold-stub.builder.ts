import { isNil } from '@carrot-fndn/shared/helpers';
import {
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
  MassIdDocumentActorType,
  MethodologyDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { stubArray } from '@carrot-fndn/shared/testing';
import {
  type Geolocation,
  type MethodologyAddress,
  type MethodologyParticipant,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';

import type { StubBoldDocumentParameters } from './bold.stubs.types';

import {
  generateNearbyCoordinates,
  stubAddress,
  stubCreditDocument,
  stubDocumentEvent,
  stubParticipant,
  stubParticipantHomologationGroupDocument,
} from '../stubs';
import {
  stubBoldMassIdDocument,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdPickUpEvent,
} from './bold-mass-id.stubs';
import { stubBoldMassIdAuditDocument } from './bold-mass-id-audit.stubs';
import { stubBoldMethodologyDefinitionDocument } from './bold-methodology-definition.stubs';
import { stubBoldHomologationDocument } from './bold-participant-homologation.stubs';

const { ACTOR, DROP_OFF, LINK, OUTPUT, PICK_UP, RELATED } = DocumentEventName;
const { MASS_ID, METHODOLOGY } = DocumentCategory;
const { CREDIT, DEFINITION, MASS_ID_AUDIT, ORGANIC, PARTICIPANT_HOMOLOGATION } =
  DocumentType;
const { FOOD_FOOD_WASTE_AND_BEVERAGES, GROUP, PROCESS, TCC, TRC } =
  DocumentSubtype;

export interface BoldStubsBuilderOptions {
  massIdActorParticipants?: Map<string, MethodologyParticipant>;
  massIdAuditDocumentId?: string;
  massIdDocumentId?: string;
}

export interface BoldStubsBuilderResult {
  creditDocuments: Document[];
  creditDocumentsStubs: Document[];
  massIdActorParticipants: Map<string, MethodologyParticipant>;
  massIdAuditDocument: Document;
  massIdAuditId: string;
  massIdDocument: Document;
  massIdDocumentId: string;
  massIdactorParticipantsAddresses: Map<string, MethodologyAddress>;
  methodologyActorParticipants: Map<string, MethodologyParticipant>;
  methodologyDocument: Document | undefined;
  participantsHomologationDocuments: Map<string, Document>;
}

export const MASS_ID_ACTOR_PARTICIPANTS = [
  MassIdDocumentActorType.HAULER,
  MassIdDocumentActorType.INTEGRATOR,
  MassIdDocumentActorType.PROCESSOR,
  MassIdDocumentActorType.RECYCLER,
  MassIdDocumentActorType.WASTE_GENERATOR,
] as const;

export const METHODOLOGY_ACTOR_PARTICIPANTS = [
  MethodologyDocumentActorType.APPOINTED_NGO,
  MethodologyDocumentActorType.NETWORK,
  MethodologyDocumentActorType.METHODOLOGY_AUTHOR,
  MethodologyDocumentActorType.METHODOLOGY_DEVELOPER,
] as const;

export class BoldStubsBuilder {
  private readonly actorsCoordinates: Map<
    string,
    { base: Geolocation; nearby: Geolocation }
  >;

  private creditDocuments: Document[] = [];

  private creditDocumentsStubs: Document[] = [];

  private creditReferences: DocumentReference[] = [];

  private readonly massAuditReference: DocumentReference;

  private readonly massIdActorParticipants: Map<string, MethodologyParticipant>;

  private readonly massIdActorParticipantsAddresses: Map<
    string,
    MethodologyAddress
  >;

  private massIdAuditDocument: Document;

  private readonly massIdAuditDocumentId: string;

  private massIdDocument: Document;

  private readonly massIdDocumentId: string;

  private readonly massIdReference: DocumentReference;

  private readonly methodologyActorParticipants: Map<
    string,
    MethodologyParticipant
  >;

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

    this.massIdActorParticipants = this.initializeMassIdActorParticipants(
      options.massIdActorParticipants,
    );

    this.methodologyActorParticipants =
      this.initializeMethodologyActorParticipants();
    this.actorsCoordinates = this.initializeActorsCoordinates();
    this.massIdActorParticipantsAddresses = this.initializeActorAddresses();

    this.massIdReference = this.createMassIdReference();
    this.massAuditReference = this.createMassAuditReference();
  }

  private addCreditReferencesToMassIdDocument(): Document {
    return {
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
  }

  private addExternalEventToDocument(
    document: Document,
    event: DocumentEvent,
  ): Document {
    return {
      ...document,
      externalEvents: [...(document.externalEvents ?? []), event],
    };
  }

  private createCreditDocuments(references: DocumentReference[]): Document[] {
    return references.map((reference) =>
      stubCreditDocument({
        id: reference.documentId,
        subtype: reference.subtype,
      }),
    );
  }

  private createCreditReferences(
    count: number,
    creditType: typeof TCC | typeof TRC,
  ): DocumentReference[] {
    return stubArray(
      () => ({
        category: METHODOLOGY,
        documentId: faker.string.uuid(),
        subtype: creditType,
        type: CREDIT,
      }),
      { max: count },
    );
  }

  private createDefaultMassIdEventsMap(
    actorEvents: Record<string, DocumentEvent>,
  ): Map<string, DocumentEvent> {
    return new Map([
      [
        DROP_OFF,
        stubBoldMassIdDropOffEvent({
          partialDocumentEvent: {
            address: this.massIdActorParticipantsAddresses.get(
              MassIdDocumentActorType.RECYCLER,
            )!,
            participant: this.massIdActorParticipants.get(
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
            address: this.massIdActorParticipantsAddresses.get(
              MassIdDocumentActorType.WASTE_GENERATOR,
            )!,
            participant: this.massIdActorParticipants.get(
              MassIdDocumentActorType.WASTE_GENERATOR,
            )!,
          },
        }),
      ],
      ...Object.entries(actorEvents),
    ]);
  }

  private createMassAuditReference(): DocumentReference {
    return {
      category: METHODOLOGY,
      documentId: this.massIdAuditDocumentId,
      subtype: PROCESS,
      type: MASS_ID_AUDIT,
    };
  }

  private createMassIdActorEvents(): Record<string, DocumentEvent> {
    return Object.fromEntries(
      Array.from(this.massIdActorParticipants, ([actorType, participant]) => [
        `${ACTOR}-${actorType}`,
        stubDocumentEvent({
          address: this.massIdActorParticipantsAddresses.get(actorType)!,
          label: actorType,
          name: ACTOR,
          participant,
        }),
      ]),
    );
  }

  private createMassIdReference(): DocumentReference {
    return {
      category: MASS_ID,
      documentId: this.massIdDocumentId,
      subtype: FOOD_FOOD_WASTE_AND_BEVERAGES,
      type: ORGANIC,
    };
  }

  private createMethodologyActorEvents(): Record<string, DocumentEvent> {
    return Object.fromEntries(
      Array.from(
        this.methodologyActorParticipants,
        ([actorType, participant]) => [
          `${ACTOR}-${actorType}`,
          stubDocumentEvent({
            label: actorType,
            name: ACTOR,
            participant,
          }),
        ],
      ),
    );
  }

  private createParticipantHomologationReference(
    subtype: string,
  ): DocumentReference {
    return {
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      subtype,
      type: PARTICIPANT_HOMOLOGATION,
    };
  }

  private initializeActorAddresses(): Map<string, MethodologyAddress> {
    return new Map(
      MASS_ID_ACTOR_PARTICIPANTS.map((subtype) => {
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
  }

  private initializeActorsCoordinates(): Map<
    string,
    { base: Geolocation; nearby: Geolocation }
  > {
    return new Map(
      MASS_ID_ACTOR_PARTICIPANTS.map((subtype) => [
        subtype,
        generateNearbyCoordinates(),
      ]),
    );
  }

  private initializeMassIdActorParticipants(
    providedParticipants?: Map<string, MethodologyParticipant>,
  ): Map<string, MethodologyParticipant> {
    if (providedParticipants) {
      return providedParticipants;
    }

    return new Map(
      MASS_ID_ACTOR_PARTICIPANTS.map((subtype) => [
        subtype,
        stubParticipant({ type: subtype }),
      ]),
    );
  }

  private initializeMethodologyActorParticipants(): Map<
    string,
    MethodologyParticipant
  > {
    return new Map(
      METHODOLOGY_ACTOR_PARTICIPANTS.map((subtype) => {
        const participant = stubParticipant({ type: subtype });

        return [subtype, participant];
      }),
    );
  }

  private mergeEventsMaps(
    defaultEventsMap: Map<string, DocumentEvent>,
    externalEventsMap: StubBoldDocumentParameters['externalEventsMap'],
  ): Map<string, DocumentEvent | undefined> {
    return new Map([
      ...defaultEventsMap,
      ...(externalEventsMap instanceof Map
        ? externalEventsMap
        : Object.entries(externalEventsMap ?? {})),
    ]);
  }

  private validateMassIdDocumentExists(): void {
    if (isNil(this.massIdDocument)) {
      throw new Error(
        'MassID document must be created first. Call createMassIdDocument() before this method.',
      );
    }
  }

  private validateMassIdDocumentsExist(): void {
    if (isNil(this.massIdDocument) || isNil(this.massIdAuditDocument)) {
      throw new Error(
        'MassID documents must be created first. Call createMassIdDocument() and createMassIdAuditDocument() before this method.',
      );
    }
  }

  private validateMethodologyDocumentsExist(): void {
    if (
      isNil(this.methodologyReference) ||
      isNil(this.participantHomologationGroupReference) ||
      isNil(this.participantHomologationGroupDocument)
    ) {
      throw new Error(
        'Methodology documents must be created first. Call createMethodologyDocuments() before this method.',
      );
    }
  }

  build(): BoldStubsBuilderResult {
    return {
      creditDocuments: this.creditDocuments,
      creditDocumentsStubs: this.creditDocumentsStubs,
      massIdActorParticipants: this.massIdActorParticipants,
      massIdAuditDocument: this.massIdAuditDocument,
      massIdAuditId: this.massIdAuditDocumentId,
      massIdDocument: this.massIdDocument,
      massIdDocumentId: this.massIdDocumentId,
      massIdactorParticipantsAddresses: this.massIdActorParticipantsAddresses,
      methodologyActorParticipants: this.methodologyActorParticipants,
      methodologyDocument: this.methodologyDocument,
      participantsHomologationDocuments: this.participantsHomologationDocuments,
    };
  }

  createMassIdAuditDocument({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateMassIdDocumentExists();

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
    const actorEvents = this.createMassIdActorEvents();
    const defaultEventsMap = this.createDefaultMassIdEventsMap(actorEvents);
    const mergedEventsMap = isNil(externalEventsMap)
      ? defaultEventsMap
      : this.mergeEventsMaps(defaultEventsMap, externalEventsMap);

    this.massIdDocument = stubBoldMassIdDocument({
      externalEventsMap: mergedEventsMap,
      partialDocument: {
        ...partialDocument,
        id: this.massIdReference.documentId,
      },
    });

    return this;
  }

  createMethodologyDocument({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateMassIdDocumentsExist();

    const actorEvents = this.createMethodologyActorEvents();

    const defaultEventsMap = new Map([
      ...Object.entries(actorEvents),
      [
        OUTPUT,
        stubDocumentEvent({
          name: OUTPUT,
          relatedDocument: this.participantHomologationGroupReference,
        }),
      ],
    ]);

    const mergedEventsMap = isNil(externalEventsMap)
      ? defaultEventsMap
      : this.mergeEventsMaps(defaultEventsMap, externalEventsMap);

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

    this.methodologyDocument = stubBoldMethodologyDefinitionDocument({
      externalEventsMap: mergedEventsMap,
      partialDocument: {
        ...partialDocument,
        id: this.methodologyReference.documentId,
      },
    });

    this.massIdAuditDocument = this.addExternalEventToDocument(
      this.massIdAuditDocument,
      stubDocumentEvent({
        name: LINK,
        referencedDocument: this.methodologyReference,
        relatedDocument: undefined,
      }),
    );

    return this;
  }

  createParticipantHomologationDocuments(
    homologationDocuments?: Map<string, StubBoldDocumentParameters>,
  ): BoldStubsBuilder {
    this.validateMethodologyDocumentsExist();

    for (const subtype of MASS_ID_ACTOR_PARTICIPANTS) {
      const reference = this.createParticipantHomologationReference(subtype);
      const primaryAddress =
        this.massIdActorParticipantsAddresses.get(subtype)!;
      const primaryParticipant = this.massIdActorParticipants.get(subtype)!;

      const defaultEventsMap = new Map([
        [
          DocumentEventName.HOMOLOGATION_CONTEXT,
          stubDocumentEvent({
            address: primaryAddress,
            name: DocumentEventName.HOMOLOGATION_CONTEXT,
            participant: primaryParticipant,
          }),
        ],
      ]);

      const externalEventsMap =
        homologationDocuments?.get(subtype)?.externalEventsMap;
      const mergedEventsMap = this.mergeEventsMaps(
        defaultEventsMap,
        externalEventsMap,
      );

      const documentStub = stubBoldHomologationDocument({
        externalEventsMap: mergedEventsMap,
        partialDocument: {
          id: reference.documentId,
          parentDocumentId:
            this.participantHomologationGroupReference!.documentId,
          primaryAddress,
          primaryParticipant,
          subtype,
        },
      });

      this.participantHomologationGroupDocument =
        this.addExternalEventToDocument(
          this.participantHomologationGroupDocument!,
          stubDocumentEvent({
            address: primaryAddress,
            name: OUTPUT,
            participant: primaryParticipant,
            relatedDocument: reference,
          }),
        );

      this.massIdAuditDocument = this.addExternalEventToDocument(
        this.massIdAuditDocument,
        stubDocumentEvent({
          address: primaryAddress,
          name: LINK,
          participant: primaryParticipant,
          referencedDocument: reference,
          relatedDocument: undefined,
        }),
      );

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
    this.validateMassIdDocumentExists();

    const creditCount = Math.max(1, count);

    this.creditReferences = this.createCreditReferences(
      creditCount,
      creditType,
    );
    this.creditDocuments = this.createCreditDocuments(this.creditReferences);

    this.massIdDocument = this.addCreditReferencesToMassIdDocument();

    return this;
  }
}
