import type { AttributePrivacySpec } from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/privacy-flags/constants';
import type {
  BoldAttributeName,
  BoldDocumentEventName,
  MassIDActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import type { DocumentEventAttributeFormat } from '@carrot-fndn/shared/types';

export interface AttributeDictionary {
  attributes: AttributeDictionaryEntry[];
}

export interface AttributeDictionaryEntry {
  allowedValues?: readonly string[];
  format?: DocumentEventAttributeFormat;
  name: BoldAttributeName;
  notes?: string;
  required: AttributeRequirement['required'];
  valueType: AttributeValueShape['valueType'];
  visibility?: AttributePrivacySpec;
}

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

export type CatalogAttribute = AttributeRequirement &
  AttributeValueShape & {
    allowedValues?: readonly string[];
    format?: DocumentEventAttributeFormat;
    name: BoldAttributeName;
  };

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

export type EmittedArtifact =
  | AttributeDictionary
  | CatalogDocument
  | EventPayload
  | EventsManifest;

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

type AttributeRequirement =
  | { notes: string; required: 'conditional' }
  | { notes?: string; required: 'no' | 'yes' };

type AttributeValueShape =
  | { example?: boolean; valueType: 'boolean' }
  | { example?: number; valueType: 'number' }
  | { example?: string; valueType: 'string' };
