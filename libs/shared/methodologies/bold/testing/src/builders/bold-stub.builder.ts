import { isNil } from '@carrot-fndn/shared/helpers';
import {
  BoldMethodologyName,
  BoldMethodologySlug,
  type Document,
  DocumentCategory,
  type DocumentEvent,
  DocumentEventAttributeName,
  DocumentEventName,
  type DocumentRelation,
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
  stubParticipantAccreditationGroupDocument,
} from '../stubs';
import { stubBoldCertificateDocument } from './bold-certificate.stubs';
import { stubBoldCreditOrderDocument } from './bold-credit-order.stubs';
import { stubBoldMassIdAuditDocument } from './bold-mass-id-audit.stubs';
import {
  stubBoldMassIdDocument,
  stubBoldMassIdDropOffEvent,
  stubBoldMassIdPickUpEvent,
} from './bold-mass-id.stubs';
import { stubBoldMethodologyDefinitionDocument } from './bold-methodology-definition.stubs';
import { stubBoldAccreditationDocument } from './bold-participant-accreditation.stubs';

const { ACTOR, DROP_OFF, LINK, OUTPUT, PICK_UP, RELATED } = DocumentEventName;
const { MASS_ID, METHODOLOGY } = DocumentCategory;
const {
  CREDIT_ORDER,
  DEFINITION,
  GAS_ID,
  MASS_ID_AUDIT,
  ORGANIC,
  PARTICIPANT_ACCREDITATION,
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
  participantsAccreditationDocuments: Map<string, Document>;
}

export const MASS_ID_ACTOR_PARTICIPANTS = [
  MassIdDocumentActorType.HAULER,
  MassIdDocumentActorType.INTEGRATOR,
  MassIdDocumentActorType.PROCESSOR,
  MassIdDocumentActorType.RECYCLER,
  MassIdDocumentActorType.WASTE_GENERATOR,
] as const;

export const METHODOLOGY_ACTOR_PARTICIPANTS = [
  MethodologyDocumentActorType.COMMUNITY_IMPACT_POOL,
  MethodologyDocumentActorType.NETWORK,
  MethodologyDocumentActorType.METHODOLOGY_AUTHOR,
  MethodologyDocumentActorType.METHODOLOGY_DEVELOPER,
] as const;

const MASS_ID_CERTIFICATE_BY_METHODOLOGY_NAME = {
  [BoldMethodologyName.CARBON]: GAS_ID,
  [BoldMethodologyName.RECYCLING]: RECYCLED_ID,
} as const satisfies Record<BoldMethodologyName, DocumentType>;

export class BoldStubsBuilder {
  private _creditOrderDocument?: Document;

  private _massIdAuditDocuments: Document[] = [];

  private _massIdCertificateDocuments: Document[] = [];

  private _massIdDocuments: Document[] = [];

  private readonly actorsCoordinates: Map<
    string,
    { base: Geolocation; nearby: Geolocation }
  >;

  private boldMethodologyName: BoldMethodologyName;

  private count: number;

  private creditOrderRelation?: DocumentRelation;

  private readonly massIdActorParticipants: Map<string, MethodologyParticipant>;

  private readonly massIdActorParticipantsAddresses: Map<
    string,
    MethodologyAddress
  >;

  private massIdAuditDocumentIds: string[];

  private massIdAuditRelations: DocumentRelation[] = [];

  private massIdCertificateDocumentIds: string[];

  private massIdCertificateDocumentRelations: DocumentRelation[] = [];

  private massIdDocumentIds: string[];

  private massIdRelations: DocumentRelation[] = [];

  private readonly methodologyActorParticipants: Map<
    string,
    MethodologyParticipant
  >;

  private methodologyDocument?: Document;

  private methodologyRelation?: DocumentRelation;

  private participantAccreditationGroupDocument?: Document;

  private participantAccreditationGroupRelation?: DocumentRelation;

  private participantsAccreditationDocuments: Map<string, Document> = new Map();

  private participantsAccreditationRelations: Map<string, DocumentRelation> =
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

    this.massIdRelations = this.createMassIdRelations();
    this.massIdCertificateDocumentRelations =
      this.createMassIdCertificateDocumentRelations();
    this.massIdAuditRelations = this.createMassIdAuditRelations();
  }

  addMassIdCertificateDocumentRelationsToMassIdAuditDocuments(): void {
    this._massIdAuditDocuments = this._massIdAuditDocuments.map(
      (document, index) =>
        this.addExternalEventToDocument(
          document,
          stubDocumentEvent({
            name: RELATED,
            relatedDocument: this.massIdCertificateDocumentRelations[index],
          }),
        ),
    );
  }

  build(): BoldStubsBuilderResult {
    const _creditOrderDocument = this._creditOrderDocument;
    const _massIdAuditDocuments = this._massIdAuditDocuments;
    const _massIdCertificateDocuments = this._massIdCertificateDocuments;
    const _massIdDocuments = this._massIdDocuments;

    return {
      boldMethodologyName: this.boldMethodologyName,
      get creditOrderDocument() {
        if (isNil(_creditOrderDocument)) {
          throw new Error(
            'Credit order document not created. Call createCreditOrderDocument() first.',
          );
        }

        return _creditOrderDocument;
      },
      massIdActorParticipants: this.massIdActorParticipants,
      massIdActorParticipantsAddresses: this.massIdActorParticipantsAddresses,
      get massIdAuditDocument() {
        if (_massIdAuditDocuments.length === 0) {
          throw new Error(
            'No massId audit documents created. Call createMassIdAuditDocuments() before building.',
          );
        }

        return _massIdAuditDocuments[0]!;
      },
      massIdAuditDocuments: _massIdAuditDocuments,
      massIdAuditIds: this.massIdAuditDocumentIds,
      get massIdCertificateDocument() {
        if (_massIdCertificateDocuments.length === 0) {
          throw new Error(
            'No certificate documents created. Call createCertificateDocuments() before building.',
          );
        }

        return _massIdCertificateDocuments[0]!;
      },
      massIdCertificateDocuments: _massIdCertificateDocuments,
      get massIdDocument() {
        if (_massIdDocuments.length === 0) {
          throw new Error(
            'No massId documents created. Call createMassIdDocuments() before building.',
          );
        }

        return _massIdDocuments[0]!;
      },
      massIdDocumentIds: this.massIdDocumentIds,
      massIdDocuments: _massIdDocuments,
      methodologyActorParticipants: this.methodologyActorParticipants,
      methodologyDocument: this.methodologyDocument,
      participantsAccreditationDocuments:
        this.participantsAccreditationDocuments,
    };
  }

  createCreditOrderDocument({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateCertificateDocumentsExist();

    this.creditOrderRelation = this.createCreditOrderDocumentRelation();
    const creditOrderDocument = stubBoldCreditOrderDocument({
      externalEventsMap,
      partialDocument: {
        ...partialDocument,
        id: this.creditOrderRelation.documentId,
      },
    });

    this._creditOrderDocument = creditOrderDocument;

    this.addCertificatesReflationsToCreditOrderDocument();

    this._massIdCertificateDocuments = this._massIdCertificateDocuments.map(
      (document) => this.addCreditRelationToMassIdCertificateDocument(document),
    );

    return this;
  }

  createMassIdAuditDocuments({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateMassIdDocumentsExist();

    const methodologyEventName = `${this.boldMethodologyName} Methodology`;

    this._massIdAuditDocuments = this._massIdDocuments.map(
      (massIdDocument, index) =>
        stubBoldMassIdAuditDocument({
          externalEventsMap: {
            [LINK]: stubDocumentEvent({
              name: LINK,
              relatedDocument: this.massIdRelations[index],
            }),
            [methodologyEventName]: stubDocumentEventWithMetadataAttributes(
              {
                name: methodologyEventName,
                relatedDocument: this.methodologyRelation,
              },
              [[METHODOLOGY_SLUG, BoldMethodologySlug.RECYCLING]],
            ),
            ...externalEventsMap,
          },
          partialDocument: {
            ...partialDocument,
            currentValue: massIdDocument.currentValue,
            id: this.massIdAuditRelations[index]!.documentId,
            parentDocumentId: massIdDocument.id,
          },
        }),
    );

    this.addMassIdAuditRelationsToMassIdDocuments();

    return this;
  }

  createMassIdCertificateDocuments({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateMassIdAuditDocumentsExist();

    this.massIdCertificateDocumentRelations =
      this.createMassIdCertificateDocumentRelations();

    this._massIdCertificateDocuments = this._massIdAuditDocuments.map(
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
            type: this.massIdCertificateDocumentRelations[index]!.type,
            ...partialDocument,
            id: this.massIdCertificateDocumentRelations[index]!.documentId,
            parentDocumentId: auditDocument.id,
          },
        });
      },
    );

    this.addMassIdCertificateDocumentRelationsToMassIdDocuments();
    this.addMassIdCertificateDocumentRelationsToMassIdAuditDocuments();

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

      this.massIdRelations = this.createMassIdRelations();
      this.massIdAuditRelations = this.createMassIdAuditRelations();
      this.massIdCertificateDocumentRelations =
        this.createMassIdCertificateDocumentRelations();
    }

    const actorEvents = this.createMassIdActorEvents();

    this._massIdDocuments = this.massIdDocumentIds.map((_, index) => {
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
          id: this.massIdRelations[index]!.documentId,
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
          relatedDocument: this.participantAccreditationGroupRelation!,
        }),
      ],
    ]);

    const mergedEventsMap = isNil(externalEventsMap)
      ? defaultEventsMap
      : this.mergeEventsMaps(defaultEventsMap, externalEventsMap);

    this.methodologyRelation = {
      bidirectional: false,
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      type: DEFINITION,
    };

    this.participantAccreditationGroupRelation = {
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      subtype: GROUP,
      type: PARTICIPANT_ACCREDITATION,
    };

    this.participantAccreditationGroupDocument =
      stubParticipantAccreditationGroupDocument({
        id: this.participantAccreditationGroupRelation.documentId,
        parentDocumentId: this.methodologyRelation.documentId,
      });

    this.methodologyDocument = stubBoldMethodologyDefinitionDocument({
      externalEventsMap: mergedEventsMap,
      partialDocument: {
        ...partialDocument,
        id: this.methodologyRelation.documentId,
      },
    });

    this._massIdAuditDocuments = this._massIdAuditDocuments.map(
      (auditDocument) =>
        this.addExternalEventToDocument(
          auditDocument,
          stubDocumentEvent({
            name: LINK,
            relatedDocument: this.methodologyRelation,
          }),
        ),
    );

    return this;
  }

  createParticipantAccreditationDocuments(
    accreditationDocuments?: Map<string, StubBoldDocumentParameters>,
  ): BoldStubsBuilder {
    this.validateMethodologyDocumentsExist();

    for (const subtype of MASS_ID_ACTOR_PARTICIPANTS) {
      const relation = this.createParticipantAccreditationRelation(subtype);
      const primaryAddress =
        this.massIdActorParticipantsAddresses.get(subtype)!;
      const primaryParticipant = this.massIdActorParticipants.get(subtype)!;

      const defaultEventsMap = new Map([
        [
          DocumentEventName.ACCREDITATION_CONTEXT,
          stubDocumentEvent({
            address: primaryAddress,
            name: DocumentEventName.ACCREDITATION_CONTEXT,
            participant: primaryParticipant,
          }),
        ],
      ]);

      const externalEventsMap =
        accreditationDocuments?.get(subtype)?.externalEventsMap;
      const mergedEventsMap = this.mergeEventsMaps(
        defaultEventsMap,
        externalEventsMap,
      );

      const documentStub = stubBoldAccreditationDocument({
        externalEventsMap: mergedEventsMap,
        partialDocument: {
          id: relation.documentId,
          parentDocumentId:
            this.participantAccreditationGroupRelation!.documentId,
          primaryAddress,
          primaryParticipant,
          subtype,
        },
      });

      this.participantAccreditationGroupDocument =
        this.addExternalEventToDocument(
          this.participantAccreditationGroupDocument!,
          stubDocumentEvent({
            address: primaryAddress,
            name: OUTPUT,
            participant: primaryParticipant,
            relatedDocument: relation,
          }),
        );

      this._massIdAuditDocuments = this._massIdAuditDocuments.map(
        (auditDocument) =>
          this.addExternalEventToDocument(
            auditDocument,
            stubDocumentEvent({
              address: primaryAddress,
              name: LINK,
              participant: primaryParticipant,
              relatedDocument: { ...relation, bidirectional: false },
            }),
          ),
      );

      this.participantsAccreditationRelations.set(subtype, relation);
      this.participantsAccreditationDocuments.set(subtype, documentStub);
    }

    return this;
  }

  private addCertificatesReflationsToCreditOrderDocument(): void {
    this._creditOrderDocument = {
      ...this._creditOrderDocument!,
      externalEvents: [
        ...(this._creditOrderDocument?.externalEvents ?? []),
        ...this.massIdCertificateDocumentRelations.map((relation) =>
          stubDocumentEvent({
            name: RELATED,
            relatedDocument: relation,
          }),
        ),
      ],
    };
  }

  private addCreditRelationToMassIdCertificateDocument(
    massIdCertificateDocument: Document,
  ): Document {
    return {
      ...massIdCertificateDocument,
      externalEvents: [
        ...(massIdCertificateDocument.externalEvents ?? []),
        stubDocumentEvent({
          name: RELATED,
          relatedDocument: this.creditOrderRelation,
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

  private addMassIdAuditRelationsToMassIdDocuments(): void {
    this._massIdDocuments = this._massIdDocuments.map((document, index) =>
      this.addExternalEventToDocument(
        document,
        stubDocumentEvent({
          name: LINK,
          relatedDocument: this.massIdAuditRelations[index],
        }),
      ),
    );
  }

  private addMassIdCertificateDocumentRelationsToMassIdDocuments(): void {
    this._massIdDocuments = this._massIdDocuments.map((document, index) =>
      this.addExternalEventToDocument(
        document,
        stubDocumentEvent({
          name: RELATED,
          relatedDocument: this.massIdCertificateDocumentRelations[index],
        }),
      ),
    );
  }

  private createCreditOrderDocumentRelation(): DocumentRelation {
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
          relatedDocument: this.massIdRelations[index]!,
        }),
      ],
      [
        MASS_ID_AUDIT,
        stubDocumentEvent({
          name: MASS_ID_AUDIT,
          relatedDocument: this.massIdAuditRelations[index]!,
        }),
      ],
      [
        methodologyEventName,
        stubDocumentEvent({
          name: methodologyEventName,
          relatedDocument: this.methodologyRelation,
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
          relatedDocument: this.massIdAuditRelations[index],
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

  private createMassIdAuditRelations(): DocumentRelation[] {
    return this.massIdAuditDocumentIds.map((documentId) => ({
      category: METHODOLOGY,
      documentId,
      subtype: PROCESS,
      type: MASS_ID_AUDIT,
    }));
  }

  private createMassIdCertificateDocumentRelations(): DocumentRelation[] {
    return this.massIdCertificateDocumentIds.map((documentId) => ({
      category: METHODOLOGY,
      documentId,
      type: MASS_ID_CERTIFICATE_BY_METHODOLOGY_NAME[this.boldMethodologyName],
    }));
  }

  private createMassIdRelations(): DocumentRelation[] {
    return this.massIdDocumentIds.map((documentId) => ({
      bidirectional: false,
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

  private createParticipantAccreditationRelation(
    subtype: string,
  ): DocumentRelation {
    return {
      category: METHODOLOGY,
      documentId: faker.string.uuid(),
      subtype,
      type: PARTICIPANT_ACCREDITATION,
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
      this._massIdDocuments.length === 0 ||
      this._massIdAuditDocuments.length === 0
    ) {
      throw new Error(
        'MassID documents must be created first. Call createMassIdDocuments() and createMassIdAuditDocuments() before this method.',
      );
    }
  }

  private validateCertificateDocumentsExist(): void {
    if (this._massIdCertificateDocuments.length === 0) {
      throw new Error(
        'MassID Certificate documents must be created first. Call createCertificateDocuments() before this method.',
      );
    }
  }

  private validateMassIdAuditDocumentsExist(): void {
    if (this._massIdAuditDocuments.length === 0) {
      throw new Error(
        'MassID Audit documents must be created first. Call createMassIdAuditDocuments() before this method.',
      );
    }
  }

  private validateMassIdDocumentsExist(): void {
    if (this._massIdDocuments.length === 0) {
      throw new Error(
        'MassID documents must be created first. Call createMassIdDocuments() before this method.',
      );
    }
  }

  private validateMethodologyDocumentsExist(): void {
    if (
      isNil(this.methodologyRelation) ||
      isNil(this.participantAccreditationGroupRelation) ||
      isNil(this.participantAccreditationGroupDocument)
    ) {
      throw new Error(
        'Methodology documents must be created first. Call createMethodologyDocuments() before this method.',
      );
    }
  }
}
