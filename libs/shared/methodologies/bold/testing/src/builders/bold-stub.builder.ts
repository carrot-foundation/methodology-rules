import { isNil } from '@carrot-fndn/shared/helpers';
import {
  BoldMethodologyName,
  BoldMethodologySlug,
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  type DocumentReference,
  DocumentSubtype,
  DocumentType,
  MassIdDocumentActorType,
  MethodologyDocumentActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import {
  type Geolocation,
  type MethodologyAddress,
  type MethodologyParticipant,
} from '@carrot-fndn/shared/types';
import { faker } from '@faker-js/faker';
import { random } from 'typia';

import type { StubBoldDocumentParameters } from './bold.stubs.types';

import {
  generateNearbyCoordinates,
  stubAddress,
  stubDocumentEvent,
  stubDocumentEventWithMetadataAttributes,
  stubParticipant,
  stubParticipantHomologationGroupDocument,
} from '../stubs';
import { stubBoldCertificateDocument } from './bold-certificate.stubs';
import { stubBoldCreditOrderDocument } from './bold-credit-order.stubs';
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
const {
  CREDIT_ORDER,
  DEFINITION,
  GAS_ID,
  MASS_ID_AUDIT,
  ORGANIC,
  PARTICIPANT_HOMOLOGATION,
  RECYCLED_ID,
} = DocumentType;
const { FOOD_FOOD_WASTE_AND_BEVERAGES, GROUP, PROCESS } = DocumentSubtype;
const { METHODOLOGY_SLUG } = DocumentEventAttributeName;

export interface BoldStubsBuilderOptions {
  count?: number;
  massIdActorParticipants?: Map<string, MethodologyParticipant>;
  massIdAuditDocumentIds?: string[];
  massIdCertificateDocumentIds?: string[];
  massIdDocumentIds?: string[];
  methodologyActorParticipants?: Map<string, MethodologyParticipant>;
  methodologyName?: BoldMethodologyName;
}

export interface BoldStubsBuilderResult {
  boldMethodologyName: BoldMethodologyName;
  creditOrderDocument: Document;
  massIdActorParticipants: Map<string, MethodologyParticipant>;
  massIdActorParticipantsAddresses: Map<string, MethodologyAddress>;
  massIdAuditDocument: Document;
  massIdAuditDocuments: Document[];
  massIdAuditIds: string[];
  massIdCertificateDocument: Document;
  massIdCertificateDocuments: Document[];
  massIdDocument: Document;
  massIdDocumentIds: string[];
  massIdDocuments: Document[];
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

const MASS_ID_CERTIFICATE_BY_METHODOLOGY_NAME = {
  [BoldMethodologyName.CARBON]: GAS_ID,
  [BoldMethodologyName.RECYCLING]: RECYCLED_ID,
} as const satisfies Record<BoldMethodologyName, DocumentType>;

export class BoldStubsBuilder {
  private readonly actorsCoordinates: Map<
    string,
    { base: Geolocation; nearby: Geolocation }
  >;

  private boldMethodologyName: BoldMethodologyName;

  private count: number;

  private creditOrderDocument?: Document;

  private creditOrderReference?: DocumentReference;

  private readonly massIdActorParticipants: Map<string, MethodologyParticipant>;

  private readonly massIdActorParticipantsAddresses: Map<
    string,
    MethodologyAddress
  >;

  private massIdAuditDocumentIds: string[];

  private massIdAuditDocuments: Document[] = [];

  private massIdAuditReferences: DocumentReference[] = [];

  private massIdCertificateDocumentIds: string[];

  private massIdCertificateDocumentReferences: DocumentReference[] = [];

  private massIdCertificateDocuments: Document[] = [];

  private massIdDocumentIds: string[];

  private massIdDocuments: Document[] = [];

  private massIdReferences: DocumentReference[] = [];

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
    this.count = options.count ?? 1;
    this.boldMethodologyName =
      options.methodologyName ?? random<BoldMethodologyName>();

    this.massIdDocumentIds =
      options.massIdDocumentIds ??
      Array.from({ length: this.count }, () => faker.string.uuid());

    this.massIdAuditDocumentIds =
      options.massIdAuditDocumentIds ??
      Array.from({ length: this.count }, () => faker.string.uuid());

    this.massIdCertificateDocumentIds =
      options.massIdCertificateDocumentIds ??
      Array.from({ length: this.count }, () => faker.string.uuid());

    this.massIdActorParticipants = this.initializeMassIdActorParticipants(
      options.massIdActorParticipants,
    );

    this.methodologyActorParticipants =
      this.initializeMethodologyActorParticipants(
        options.methodologyActorParticipants,
      );
    this.actorsCoordinates = this.initializeActorsCoordinates();
    this.massIdActorParticipantsAddresses = this.initializeActorAddresses();

    this.massIdReferences = this.createMassIdReferences();
    this.massIdCertificateDocumentReferences =
      this.createMassIdCertificateDocumentReferences();
    this.massIdAuditReferences = this.createMassIdAuditReferences();
  }

  private addCertificatesReferencesToCreditOrderDocument(): void {
    this.creditOrderDocument = {
      ...this.creditOrderDocument!,
      externalEvents: [
        ...(this.creditOrderDocument!.externalEvents ?? []),
        ...this.massIdCertificateDocumentReferences.map((reference) =>
          stubDocumentEvent({
            name: RELATED,
            referencedDocument: undefined,
            relatedDocument: reference,
          }),
        ),
      ],
    };
  }

  private addCreditOrderReferenceToMassIdCertificateDocument(
    massIdDocument: Document,
  ): Document {
    return {
      ...massIdDocument,
      externalEvents: [
        ...(massIdDocument.externalEvents ?? []),
        stubDocumentEvent({
          name: RELATED,
          referencedDocument: undefined,
          relatedDocument: this.creditOrderReference,
        }),
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

  private addMassIdAuditReferencesToMassIdDocuments(): void {
    this.massIdDocuments = this.massIdDocuments.map((document, index) =>
      this.addExternalEventToDocument(
        document,
        stubDocumentEvent({
          name: LINK,
          referencedDocument: undefined,
          relatedDocument: this.massIdAuditReferences[index],
        }),
      ),
    );
  }

  private addMassIdCertificateDocumentReferencesToMassIdDocuments(): void {
    this.massIdDocuments = this.massIdDocuments.map((document, index) =>
      this.addExternalEventToDocument(
        document,
        stubDocumentEvent({
          name: RELATED,
          referencedDocument: undefined,
          relatedDocument: this.massIdCertificateDocumentReferences[index],
        }),
      ),
    );
  }

  private createCreditOrderDocumentReference(): DocumentReference {
    return {
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      type: CREDIT_ORDER,
    };
  }

  private createDefaultMassIdCertificateDocumentEventsMap(
    index: number,
  ): Map<string, DocumentEvent> {
    const methodologyEventName = `${this.boldMethodologyName} Methodology`;

    return new Map([
      [
        MASS_ID,
        stubDocumentEvent({
          name: MASS_ID,
          referencedDocument: undefined,
          relatedDocument: this.massIdReferences[index]!,
        }),
      ],
      [
        MASS_ID_AUDIT,
        stubDocumentEvent({
          name: MASS_ID_AUDIT,
          referencedDocument: undefined,
          relatedDocument: this.massIdAuditReferences[index]!,
        }),
      ],
      [
        methodologyEventName,
        stubDocumentEvent({
          name: methodologyEventName,
          referencedDocument: undefined,
          relatedDocument: this.methodologyReference,
        }),
      ],
    ]);
  }

  private createDefaultMassIdEventsMap(
    index: number,
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
          referencedDocument: undefined,
          relatedDocument: this.massIdAuditReferences[index],
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

  private createMassIdAuditReferences(): DocumentReference[] {
    return this.massIdAuditDocumentIds.map((documentId) => ({
      category: METHODOLOGY,
      documentId,
      subtype: PROCESS,
      type: MASS_ID_AUDIT,
    }));
  }

  private createMassIdCertificateDocumentReferences(): DocumentReference[] {
    return this.massIdCertificateDocumentIds.map((documentId) => ({
      category: METHODOLOGY,
      documentId,
      type: MASS_ID_CERTIFICATE_BY_METHODOLOGY_NAME[this.boldMethodologyName],
    }));
  }

  private createMassIdReferences(): DocumentReference[] {
    return this.massIdDocumentIds.map((documentId) => ({
      category: MASS_ID,
      documentId,
      subtype: FOOD_FOOD_WASTE_AND_BEVERAGES,
      type: ORGANIC,
    }));
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

  private initializeMethodologyActorParticipants(
    providedParticipants?: Map<string, MethodologyParticipant>,
  ): Map<string, MethodologyParticipant> {
    if (providedParticipants) {
      return providedParticipants;
    }

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

  private validateAllDocumentsExist(): void {
    if (
      this.massIdDocuments.length === 0 ||
      this.massIdAuditDocuments.length === 0
    ) {
      throw new Error(
        'MassID documents must be created first. Call createMassIdDocuments() and createMassIdAuditDocuments() before this method.',
      );
    }
  }

  private validateCertificateDocumentsExist(): void {
    if (this.massIdCertificateDocuments.length === 0) {
      throw new Error(
        'MassID Certificate documents must be created first. Call createCertificateDocuments() before this method.',
      );
    }
  }

  private validateMassIdAuditDocumentsExist(): void {
    if (this.massIdAuditDocuments.length === 0) {
      throw new Error(
        'MassID Audit documents must be created first. Call createMassIdAuditDocuments() before this method.',
      );
    }
  }

  private validateMassIdDocumentsExist(): void {
    if (this.massIdDocuments.length === 0) {
      throw new Error(
        'MassID documents must be created first. Call createMassIdDocuments() before this method.',
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

  addMassIdCertificateDocumentReferencesToMassIdAuditDocuments(): void {
    this.massIdAuditDocuments = this.massIdAuditDocuments.map(
      (document, index) =>
        this.addExternalEventToDocument(
          document,
          stubDocumentEvent({
            name: RELATED,
            referencedDocument: undefined,
            relatedDocument: this.massIdCertificateDocumentReferences[index],
          }),
        ),
    );
  }

  build(): BoldStubsBuilderResult {
    return {
      boldMethodologyName: this.boldMethodologyName,
      get creditOrderDocument() {
        if (isNil(this.creditOrderDocument)) {
          throw new Error(
            'Credit order document not created. Call createCreditOrderDocument() first.',
          );
        }

        return this.creditOrderDocument;
      },
      massIdActorParticipants: this.massIdActorParticipants,
      massIdActorParticipantsAddresses: this.massIdActorParticipantsAddresses,
      get massIdAuditDocument() {
        if (this.massIdAuditDocuments.length === 0) {
          throw new Error(
            'No massId audit documents created. Call createMassIdAuditDocuments() before building.',
          );
        }

        return this.massIdAuditDocuments[0]!;
      },
      massIdAuditDocuments: this.massIdAuditDocuments,
      massIdAuditIds: this.massIdAuditDocumentIds,
      get massIdCertificateDocument() {
        if (this.massIdCertificateDocuments.length === 0) {
          throw new Error(
            'No certificate documents created. Call createCertificateDocuments() before building.',
          );
        }

        return this.massIdCertificateDocuments[0]!;
      },
      massIdCertificateDocuments: this.massIdCertificateDocuments,
      get massIdDocument() {
        if (this.massIdDocuments.length === 0) {
          throw new Error(
            'No massId documents created. Call createMassIdDocuments() before building.',
          );
        }

        return this.massIdDocuments[0]!;
      },
      massIdDocumentIds: this.massIdDocumentIds,
      massIdDocuments: this.massIdDocuments,
      methodologyActorParticipants: this.methodologyActorParticipants,
      methodologyDocument: this.methodologyDocument,
      participantsHomologationDocuments: this.participantsHomologationDocuments,
    };
  }

  createCreditOrderDocument({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateCertificateDocumentsExist();

    this.creditOrderReference = this.createCreditOrderDocumentReference();
    const creditOrderDocument = stubBoldCreditOrderDocument({
      externalEventsMap,
      partialDocument: {
        ...partialDocument,
        id: this.creditOrderReference.documentId,
      },
    });

    this.creditOrderDocument = creditOrderDocument;

    this.addCertificatesReferencesToCreditOrderDocument();

    this.massIdCertificateDocuments = this.massIdCertificateDocuments.map(
      (document) =>
        this.addCreditOrderReferenceToMassIdCertificateDocument(document),
    );

    return this;
  }

  createMassIdAuditDocuments({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateMassIdDocumentsExist();

    const methodologyEventName = `${this.boldMethodologyName} Methodology`;

    this.massIdAuditDocuments = this.massIdDocuments.map(
      (massIdDocument, index) =>
        stubBoldMassIdAuditDocument({
          externalEventsMap: {
            [LINK]: stubDocumentEvent({
              name: LINK,
              referencedDocument: this.massIdReferences[index],
              relatedDocument: undefined,
            }),
            [methodologyEventName]: stubDocumentEventWithMetadataAttributes(
              {
                name: methodologyEventName,
                referencedDocument: undefined,
                relatedDocument: this.methodologyReference,
              },
              [[METHODOLOGY_SLUG, BoldMethodologySlug.RECYCLING]],
            ),
            ...externalEventsMap,
          },
          partialDocument: {
            ...partialDocument,
            currentValue: massIdDocument.currentValue,
            id: this.massIdAuditReferences[index]!.documentId,
            parentDocumentId: massIdDocument.id,
          },
        }),
    );

    this.addMassIdAuditReferencesToMassIdDocuments();

    return this;
  }

  createMassIdCertificateDocuments({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateMassIdAuditDocumentsExist();

    this.massIdCertificateDocumentReferences =
      this.createMassIdCertificateDocumentReferences();

    this.massIdCertificateDocuments = this.massIdAuditDocuments.map(
      (auditDocument, index) => {
        const defaultEventsMap =
          this.createDefaultMassIdCertificateDocumentEventsMap(index);

        const mergedEventsMap = isNil(externalEventsMap)
          ? defaultEventsMap
          : this.mergeEventsMaps(defaultEventsMap, externalEventsMap);

        return stubBoldCertificateDocument({
          externalEventsMap: mergedEventsMap,
          partialDocument: {
            currentValue: auditDocument.currentValue,
            type: this.massIdCertificateDocumentReferences[index]!.type,
            ...partialDocument,
            id: this.massIdCertificateDocumentReferences[index]!.documentId,
            parentDocumentId: auditDocument.id,
          },
        });
      },
    );

    this.addMassIdCertificateDocumentReferencesToMassIdDocuments();
    this.addMassIdCertificateDocumentReferencesToMassIdAuditDocuments();

    return this;
  }

  createMassIdDocuments({
    count,
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters & { count?: number } = {}): BoldStubsBuilder {
    if (count !== undefined) {
      this.count = count;

      const newMassIdDocumentIds = Array.from({ length: this.count }, () =>
        faker.string.uuid(),
      );
      const newMassIdAuditDocumentIds = Array.from({ length: this.count }, () =>
        faker.string.uuid(),
      );
      const newMassIdCertificateDocumentIds = Array.from(
        {
          length: this.count,
        },
        () => faker.string.uuid(),
      );

      this.massIdDocumentIds = newMassIdDocumentIds;
      this.massIdAuditDocumentIds = newMassIdAuditDocumentIds;
      this.massIdCertificateDocumentIds = newMassIdCertificateDocumentIds;

      this.massIdReferences = this.createMassIdReferences();
      this.massIdAuditReferences = this.createMassIdAuditReferences();
      this.massIdCertificateDocumentReferences =
        this.createMassIdCertificateDocumentReferences();
    }

    const actorEvents = this.createMassIdActorEvents();

    this.massIdDocuments = this.massIdDocumentIds.map((_, index) => {
      const defaultEventsMap = this.createDefaultMassIdEventsMap(
        index,
        actorEvents,
      );
      const mergedEventsMap = isNil(externalEventsMap)
        ? defaultEventsMap
        : this.mergeEventsMaps(defaultEventsMap, externalEventsMap);

      return stubBoldMassIdDocument({
        externalEventsMap: mergedEventsMap,
        partialDocument: {
          ...partialDocument,
          id: this.massIdReferences[index]!.documentId,
        },
      });
    });

    return this;
  }

  createMethodologyDocument({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateAllDocumentsExist();

    const actorEvents = this.createMethodologyActorEvents();

    const defaultEventsMap = new Map([
      ...Object.entries(actorEvents),
      [
        OUTPUT,
        stubDocumentEvent({
          name: OUTPUT,
          referencedDocument: undefined,
          relatedDocument: this.participantHomologationGroupReference!,
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

    this.massIdAuditDocuments = this.massIdAuditDocuments.map((auditDocument) =>
      this.addExternalEventToDocument(
        auditDocument,
        stubDocumentEvent({
          name: LINK,
          referencedDocument: this.methodologyReference,
          relatedDocument: undefined,
        }),
      ),
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
            referencedDocument: undefined,
            relatedDocument: reference,
          }),
        );

      this.massIdAuditDocuments = this.massIdAuditDocuments.map(
        (auditDocument) =>
          this.addExternalEventToDocument(
            auditDocument,
            stubDocumentEvent({
              address: primaryAddress,
              name: LINK,
              participant: primaryParticipant,
              referencedDocument: reference,
              relatedDocument: undefined,
            }),
          ),
      );

      this.participantsHomologationReferences.set(subtype, reference);
      this.participantsHomologationDocuments.set(subtype, documentStub);
    }

    return this;
  }
}
