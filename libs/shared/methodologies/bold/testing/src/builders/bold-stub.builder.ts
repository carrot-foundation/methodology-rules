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
  MassIDDocumentActorType,
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
import { stubBoldMassIDAuditDocument } from './bold-mass-id-audit.stubs';
import {
  stubBoldMassIDDocument,
  stubBoldMassIDDropOffEvent,
  stubBoldMassIDPickUpEvent,
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
  massIDActorParticipants?: Map<string, MethodologyParticipant>;
  massIDAuditDocumentIds?: string[];
  massIDCertificateDocumentIds?: string[];
  massIDDocumentIds?: string[];
  methodologyActorParticipants?: Map<string, MethodologyParticipant>;
  methodologyName?: BoldMethodologyName;
}

export interface BoldStubsBuilderResult {
  boldMethodologyName: BoldMethodologyName;
  creditOrderDocument: Document;
  massIDActorParticipants: Map<string, MethodologyParticipant>;
  massIDActorParticipantsAddresses: Map<string, MethodologyAddress>;
  massIDAuditDocument: Document;
  massIDAuditDocuments: Document[];
  massIDAuditIds: string[];
  massIDCertificateDocument: Document;
  massIDCertificateDocuments: Document[];
  massIDDocument: Document;
  massIDDocumentIds: string[];
  massIDDocuments: Document[];
  methodologyActorParticipants: Map<string, MethodologyParticipant>;
  methodologyDocument: Document | undefined;
  participantsAccreditationDocuments: Map<string, Document>;
}

export const MASS_ID_ACTOR_PARTICIPANTS = [
  MassIDDocumentActorType.HAULER,
  MassIDDocumentActorType.INTEGRATOR,
  MassIDDocumentActorType.PROCESSOR,
  MassIDDocumentActorType.RECYCLER,
  MassIDDocumentActorType.WASTE_GENERATOR,
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

  private _massIDAuditDocuments: Document[] = [];

  private _massIDCertificateDocuments: Document[] = [];

  private _massIDDocuments: Document[] = [];

  private readonly actorsCoordinates: Map<
    string,
    { base: Geolocation; nearby: Geolocation }
  >;

  private boldMethodologyName: BoldMethodologyName;

  private count: number;

  private creditOrderRelation?: DocumentRelation;

  private readonly massIDActorParticipants: Map<string, MethodologyParticipant>;

  private readonly massIDActorParticipantsAddresses: Map<
    string,
    MethodologyAddress
  >;

  private massIDAuditDocumentIds: string[];

  private massIDAuditRelations: DocumentRelation[] = [];

  private massIDCertificateDocumentIds: string[];

  private massIDCertificateDocumentRelations: DocumentRelation[] = [];

  private massIDDocumentIds: string[];

  private massIDRelations: DocumentRelation[] = [];

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

    this.massIDDocumentIds =
      options.massIDDocumentIds ??
      Array.from({ length: this.count }, () => faker.string.uuid());

    this.massIDAuditDocumentIds =
      options.massIDAuditDocumentIds ??
      Array.from({ length: this.count }, () => faker.string.uuid());

    this.massIDCertificateDocumentIds =
      options.massIDCertificateDocumentIds ??
      Array.from({ length: this.count }, () => faker.string.uuid());

    this.massIDActorParticipants = this.initializeMassIDActorParticipants(
      options.massIDActorParticipants,
    );

    this.methodologyActorParticipants =
      this.initializeMethodologyActorParticipants(
        options.methodologyActorParticipants,
      );
    this.actorsCoordinates = this.initializeActorsCoordinates();
    this.massIDActorParticipantsAddresses = this.initializeActorAddresses();

    this.massIDRelations = this.createMassIDRelations();
    this.massIDCertificateDocumentRelations =
      this.createMassIDCertificateDocumentRelations();
    this.massIDAuditRelations = this.createMassIDAuditRelations();
  }

  addMassIDCertificateDocumentRelationsToMassIDAuditDocuments(): void {
    this._massIDAuditDocuments = this._massIDAuditDocuments.map(
      (document, index) =>
        this.addExternalEventToDocument(
          document,
          stubDocumentEvent({
            name: RELATED,
            relatedDocument: this.massIDCertificateDocumentRelations[index],
          }),
        ),
    );
  }

  build(): BoldStubsBuilderResult {
    const _creditOrderDocument = this._creditOrderDocument;
    const _massIDAuditDocuments = this._massIDAuditDocuments;
    const _massIDCertificateDocuments = this._massIDCertificateDocuments;
    const _massIDDocuments = this._massIDDocuments;

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
      massIDActorParticipants: this.massIDActorParticipants,
      massIDActorParticipantsAddresses: this.massIDActorParticipantsAddresses,
      get massIDAuditDocument() {
        if (_massIDAuditDocuments.length === 0) {
          throw new Error(
            'No MassID audit documents created. Call createMassIDAuditDocuments() before building.',
          );
        }

        return _massIDAuditDocuments[0]!;
      },
      massIDAuditDocuments: _massIDAuditDocuments,
      massIDAuditIds: this.massIDAuditDocumentIds,
      get massIDCertificateDocument() {
        if (_massIDCertificateDocuments.length === 0) {
          throw new Error(
            'No certificate documents created. Call createCertificateDocuments() before building.',
          );
        }

        return _massIDCertificateDocuments[0]!;
      },
      massIDCertificateDocuments: _massIDCertificateDocuments,
      get massIDDocument() {
        if (_massIDDocuments.length === 0) {
          throw new Error(
            'No MassID documents created. Call createMassIDDocuments() before building.',
          );
        }

        return _massIDDocuments[0]!;
      },
      massIDDocumentIds: this.massIDDocumentIds,
      massIDDocuments: _massIDDocuments,
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

    this._massIDCertificateDocuments = this._massIDCertificateDocuments.map(
      (document) => this.addCreditRelationToMassIDCertificateDocument(document),
    );

    return this;
  }

  createMassIDAuditDocuments({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateMassIDDocumentsExist();

    const methodologyEventName = `${this.boldMethodologyName} Methodology`;

    this._massIDAuditDocuments = this._massIDDocuments.map(
      (massIDDocument, index) =>
        stubBoldMassIDAuditDocument({
          externalEventsMap: {
            [LINK]: stubDocumentEvent({
              name: LINK,
              relatedDocument: this.massIDRelations[index],
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
            currentValue: massIDDocument.currentValue,
            id: this.massIDAuditRelations[index]!.documentId,
            parentDocumentId: massIDDocument.id,
          },
        }),
    );

    this.addMassIDAuditRelationsToMassIDDocuments();

    return this;
  }

  createMassIDCertificateDocuments({
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters = {}): BoldStubsBuilder {
    this.validateMassIDAuditDocumentsExist();

    this.massIDCertificateDocumentRelations =
      this.createMassIDCertificateDocumentRelations();

    this._massIDCertificateDocuments = this._massIDAuditDocuments.map(
      (auditDocument, index) => {
        const defaultEventsMap =
          this.createDefaultMassIDCertificateDocumentEventsMap(index);

        const mergedEventsMap = isNil(externalEventsMap)
          ? defaultEventsMap
          : this.mergeEventsMaps(defaultEventsMap, externalEventsMap);

        return stubBoldCertificateDocument({
          externalEventsMap: mergedEventsMap,
          partialDocument: {
            currentValue: auditDocument.currentValue,
            type: this.massIDCertificateDocumentRelations[index]!.type,
            ...partialDocument,
            id: this.massIDCertificateDocumentRelations[index]!.documentId,
            parentDocumentId: auditDocument.id,
          },
        });
      },
    );

    this.addMassIDCertificateDocumentRelationsToMassIDDocuments();
    this.addMassIDCertificateDocumentRelationsToMassIDAuditDocuments();

    return this;
  }

  createMassIDDocuments({
    count,
    externalEventsMap,
    partialDocument,
  }: StubBoldDocumentParameters & { count?: number } = {}): BoldStubsBuilder {
    if (count !== undefined) {
      this.count = count;

      const newMassIdDocumentIds = Array.from({ length: this.count }, () =>
        faker.string.uuid(),
      );
      const newMassIDAuditDocumentIds = Array.from({ length: this.count }, () =>
        faker.string.uuid(),
      );
      const newMassIDCertificateDocumentIds = Array.from(
        {
          length: this.count,
        },
        () => faker.string.uuid(),
      );

      this.massIDDocumentIds = newMassIdDocumentIds;
      this.massIDAuditDocumentIds = newMassIDAuditDocumentIds;
      this.massIDCertificateDocumentIds = newMassIDCertificateDocumentIds;

      this.massIDRelations = this.createMassIDRelations();
      this.massIDAuditRelations = this.createMassIDAuditRelations();
      this.massIDCertificateDocumentRelations =
        this.createMassIDCertificateDocumentRelations();
    }

    const actorEvents = this.createMassIDActorEvents();

    this._massIDDocuments = this.massIDDocumentIds.map((_, index) => {
      const defaultEventsMap = this.createDefaultMassIDEventsMap(
        index,
        actorEvents,
      );
      const mergedEventsMap = isNil(externalEventsMap)
        ? defaultEventsMap
        : this.mergeEventsMaps(defaultEventsMap, externalEventsMap);

      return stubBoldMassIDDocument({
        externalEventsMap: mergedEventsMap,
        partialDocument: {
          ...partialDocument,
          id: this.massIDRelations[index]!.documentId,
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

    this._massIDAuditDocuments = this._massIDAuditDocuments.map(
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
        this.massIDActorParticipantsAddresses.get(subtype)!;
      const primaryParticipant = this.massIDActorParticipants.get(subtype)!;

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

      this._massIDAuditDocuments = this._massIDAuditDocuments.map(
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
        ...this.massIDCertificateDocumentRelations.map((relation) =>
          stubDocumentEvent({
            name: RELATED,
            relatedDocument: relation,
          }),
        ),
      ],
    };
  }

  private addCreditRelationToMassIDCertificateDocument(
    massIDCertificateDocument: Document,
  ): Document {
    return {
      ...massIDCertificateDocument,
      externalEvents: [
        ...(massIDCertificateDocument.externalEvents ?? []),
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

  private addMassIDAuditRelationsToMassIDDocuments(): void {
    this._massIDDocuments = this._massIDDocuments.map((document, index) =>
      this.addExternalEventToDocument(
        document,
        stubDocumentEvent({
          name: LINK,
          relatedDocument: this.massIDAuditRelations[index],
        }),
      ),
    );
  }

  private addMassIDCertificateDocumentRelationsToMassIDDocuments(): void {
    this._massIDDocuments = this._massIDDocuments.map((document, index) =>
      this.addExternalEventToDocument(
        document,
        stubDocumentEvent({
          name: RELATED,
          relatedDocument: this.massIDCertificateDocumentRelations[index],
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

  private createDefaultMassIDCertificateDocumentEventsMap(
    index: number,
  ): Map<string, DocumentEvent> {
    const methodologyEventName = `${this.boldMethodologyName} Methodology`;

    return new Map([
      [
        MASS_ID,
        stubDocumentEvent({
          name: MASS_ID,
          relatedDocument: this.massIDRelations[index]!,
        }),
      ],
      [
        MASS_ID_AUDIT,
        stubDocumentEvent({
          name: MASS_ID_AUDIT,
          relatedDocument: this.massIDAuditRelations[index]!,
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

  private createDefaultMassIDEventsMap(
    index: number,
    actorEvents: Record<string, DocumentEvent>,
  ): Map<string, DocumentEvent> {
    return new Map([
      [
        DROP_OFF,
        stubBoldMassIDDropOffEvent({
          partialDocumentEvent: {
            address: this.massIDActorParticipantsAddresses.get(
              MassIDDocumentActorType.RECYCLER,
            )!,
            participant: this.massIDActorParticipants.get(
              MassIDDocumentActorType.RECYCLER,
            )!,
          },
        }),
      ],
      [
        OUTPUT,
        stubDocumentEvent({
          name: OUTPUT,
          relatedDocument: this.massIDAuditRelations[index],
        }),
      ],
      [
        PICK_UP,
        stubBoldMassIDPickUpEvent({
          partialDocumentEvent: {
            address: this.massIDActorParticipantsAddresses.get(
              MassIDDocumentActorType.WASTE_GENERATOR,
            )!,
            participant: this.massIDActorParticipants.get(
              MassIDDocumentActorType.WASTE_GENERATOR,
            )!,
          },
        }),
      ],
      ...Object.entries(actorEvents),
    ]);
  }

  private createMassIDActorEvents(): Record<string, DocumentEvent> {
    return Object.fromEntries(
      Array.from(this.massIDActorParticipants, ([actorType, participant]) => [
        `${ACTOR}-${actorType}`,
        stubDocumentEvent({
          address: this.massIDActorParticipantsAddresses.get(actorType)!,
          label: actorType,
          name: ACTOR,
          participant,
        }),
      ]),
    );
  }

  private createMassIDAuditRelations(): DocumentRelation[] {
    return this.massIDAuditDocumentIds.map((documentId) => ({
      category: METHODOLOGY,
      documentId,
      subtype: PROCESS,
      type: MASS_ID_AUDIT,
    }));
  }

  private createMassIDCertificateDocumentRelations(): DocumentRelation[] {
    return this.massIDCertificateDocumentIds.map((documentId) => ({
      category: METHODOLOGY,
      documentId,
      type: MASS_ID_CERTIFICATE_BY_METHODOLOGY_NAME[this.boldMethodologyName],
    }));
  }

  private createMassIDRelations(): DocumentRelation[] {
    return this.massIDDocumentIds.map((documentId) => ({
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

  private initializeMassIDActorParticipants(
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
      this._massIDDocuments.length === 0 ||
      this._massIDAuditDocuments.length === 0
    ) {
      throw new Error(
        'MassID documents must be created first. Call createMassIDDocuments() and createMassIDAuditDocuments() before this method.',
      );
    }
  }

  private validateCertificateDocumentsExist(): void {
    if (this._massIDCertificateDocuments.length === 0) {
      throw new Error(
        'MassID Certificate documents must be created first. Call createCertificateDocuments() before this method.',
      );
    }
  }

  private validateMassIDAuditDocumentsExist(): void {
    if (this._massIDAuditDocuments.length === 0) {
      throw new Error(
        'MassID Audit documents must be created first. Call createMassIDAuditDocuments() before this method.',
      );
    }
  }

  private validateMassIDDocumentsExist(): void {
    if (this._massIDDocuments.length === 0) {
      throw new Error(
        'MassID documents must be created first. Call createMassIDDocuments() before this method.',
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
