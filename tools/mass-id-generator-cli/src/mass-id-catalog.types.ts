import type {
  BoldAttributeName,
  BoldDocumentEventName,
  MassIDActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type { DocumentEventAttributeFormat } from '@carrot-fndn/shared/types';

export interface AttributePayload {
  format?: DocumentEventAttributeFormat;
  isPublic: boolean;
  name: BoldAttributeName;
  sensitive?: true;
  value: boolean | number | string;
}

export interface CatalogActor {
  addressId: string;
  externalCreatedAt: string;
  label: MassIDActorType;
  participantId: string;
  slug: string;
}

export interface CatalogAttachment {
  fileName: string;
  isPublic: boolean;
  label: string;
}

export interface CatalogAttribute {
  example?: boolean | number | string;
  format?: DocumentEventAttributeFormat;
  name: BoldAttributeName;
}

export interface CatalogDocument {
  addressId: string;
  category: string;
  externalCreatedAt: string;
  isPublic: boolean;
  isPubliclySearchable: boolean;
  participantId: string;
  subtype: string;
  title: string;
  type: string;
}

export interface CatalogEvent {
  addressId: string;
  attachments?: readonly CatalogAttachment[];
  attributes: readonly CatalogAttribute[];
  externalCreatedAt: string;
  name: BoldDocumentEventName;
  participantId: string;
  slug: string;
  value?: number;
}

export type EmittedArtifact = CatalogDocument | EventPayload | EventsManifest;

export interface EventPayload {
  addressId: string;
  attachments?: readonly CatalogAttachment[];
  externalCreatedAt: string;
  isPublic: boolean;
  label?: MassIDActorType;
  metadata?: { attributes: AttributePayload[] };
  name: BoldDocumentEventName;
  participantId: string;
  preserveSensitiveData?: boolean;
  value?: number;
}

export interface EventsManifest {
  events: ManifestEvent[];
  schemaVersion: 1;
}

export interface ManifestEvent {
  artifacts: { attributes?: string; payload: string };
  name: string;
  order: number;
  slug: string;
}

export interface MassIDCatalog {
  actors: readonly CatalogActor[];
  document: CatalogDocument;
  events: readonly CatalogEvent[];
}
