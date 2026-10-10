import {
  EVENT_PRIVACY_SPEC,
  type EventPrivacySpec,
  PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC,
} from '@carrot-fndn/shared/methodologies/bold/rule-processors/mass-id/privacy-flags/constants';
import {
  BoldDocumentEventName,
  type MassIDActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type {
  AttributeDictionary,
  AttributePayload,
  CatalogActor,
  CatalogAttachment,
  CatalogAttribute,
  CatalogEvent,
  EmittedArtifact,
  EventPayload,
  EventsManifest,
  MassIDCatalog,
} from './mass-id-catalog.types';

const CREATE_MASS_ID_NAME = 'Create MassID document';
const CREATE_MASS_ID_SLUG = 'create-mass-id';
const MANIFEST_FILE_NAME = 'events-manifest.json';

interface EventPayloadFields {
  addressId: string;
  attachments?: readonly CatalogAttachment[] | undefined;
  attributes: AttributePayload[];
  externalCreatedAt: string;
  label?: MassIDActorType | undefined;
  name: BoldDocumentEventName;
  participantId: string;
  preserveSensitiveData?: boolean | undefined;
  value?: number | undefined;
}

const attributesPath = (slug: string): string =>
  `events/${slug}/attributes.json`;

const payloadPath = (slug: string): string => `events/${slug}/payload.json`;

const getEventPrivacySpec = (eventName: string): EventPrivacySpec => {
  const eventPrivacySpec = EVENT_PRIVACY_SPEC.get(eventName);

  if (eventPrivacySpec === undefined) {
    throw new Error(`No privacy spec for event "${eventName}"`);
  }

  return eventPrivacySpec;
};

const getPreserveSensitiveData = (label: string): boolean => {
  const preserveSensitiveData =
    PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC.get(label);

  if (preserveSensitiveData === undefined) {
    throw new Error(`No participant privacy spec for actor "${label}"`);
  }

  return preserveSensitiveData;
};

// Spreads pin the published key order: perfectionist does not sort across them.
const buildEventPayload = (
  fields: EventPayloadFields,
  isPublic: boolean,
): EventPayload => ({
  externalCreatedAt: fields.externalCreatedAt,
  isPublic,
  ...(fields.preserveSensitiveData !== undefined && {
    preserveSensitiveData: fields.preserveSensitiveData,
  }),
  addressId: fields.addressId,
  ...(fields.label !== undefined && { label: fields.label }),
  name: fields.name,
  participantId: fields.participantId,
  ...(fields.value !== undefined && { value: fields.value }),
  ...(fields.attributes.length > 0 && {
    metadata: { attributes: fields.attributes },
  }),
  ...(fields.attachments !== undefined && {
    attachments: fields.attachments,
  }),
});

const toAttributePayloads = (
  eventPrivacySpec: EventPrivacySpec,
  { example, format, name }: CatalogAttribute,
): AttributePayload[] => {
  if (example === undefined) {
    return [];
  }

  const attributePrivacySpec = eventPrivacySpec.attributes.get(name);

  return [
    {
      ...(format !== undefined && { format }),
      ...(attributePrivacySpec?.sensitive === true && {
        sensitive: true as const,
      }),
      isPublic: attributePrivacySpec?.isPublic ?? true,
      name,
      value: example,
    },
  ];
};

export const toEventPayload = (event: CatalogEvent): EventPayload => {
  const eventPrivacySpec = getEventPrivacySpec(event.name);

  return buildEventPayload(
    {
      addressId: event.addressId,
      attachments: event.attachments,
      attributes: event.attributes.flatMap((attribute) =>
        toAttributePayloads(eventPrivacySpec, attribute),
      ),
      externalCreatedAt: event.externalCreatedAt,
      name: event.name,
      participantId: event.participantId,
      value: event.value,
    },
    eventPrivacySpec.isPublic,
  );
};

export const toAttributeDictionary = (
  event: CatalogEvent,
): AttributeDictionary => {
  const eventPrivacySpec = getEventPrivacySpec(event.name);

  return {
    attributes: event.attributes.map((attribute) => {
      const visibility = eventPrivacySpec.attributes.get(attribute.name);

      return {
        ...(attribute.allowedValues !== undefined && {
          allowedValues: attribute.allowedValues,
        }),
        ...(attribute.format !== undefined && { format: attribute.format }),
        name: attribute.name,
        ...(attribute.notes !== undefined && { notes: attribute.notes }),
        required: attribute.required,
        valueType: attribute.valueType,
        ...(visibility !== undefined && { visibility }),
      };
    }),
  };
};

export const toActorPayload = (actor: CatalogActor): EventPayload =>
  buildEventPayload(
    {
      addressId: actor.addressId,
      attributes: [],
      externalCreatedAt: actor.externalCreatedAt,
      label: actor.label,
      name: BoldDocumentEventName.ACTOR,
      participantId: actor.participantId,
      preserveSensitiveData: getPreserveSensitiveData(actor.label),
    },
    true,
  );

export const toEventsManifest = ({
  actors,
  events,
}: MassIDCatalog): EventsManifest => ({
  events: [
    { name: CREATE_MASS_ID_NAME, slug: CREATE_MASS_ID_SLUG },
    ...actors.map(({ label, slug }) => ({
      name: `${BoldDocumentEventName.ACTOR}:${label}`,
      slug,
    })),
    ...events.map(({ name, slug }) => ({
      attributes: attributesPath(slug),
      name,
      slug,
    })),
  ].map(({ name, slug, ...artifacts }, order) => ({
    artifacts: { ...artifacts, payload: payloadPath(slug) },
    name,
    order,
    slug,
  })),
  schemaVersion: 1,
});

export const toMethodologyFiles = (
  catalog: MassIDCatalog,
): Map<string, EmittedArtifact> =>
  new Map<string, EmittedArtifact>([
    [MANIFEST_FILE_NAME, toEventsManifest(catalog)],
    [payloadPath(CREATE_MASS_ID_SLUG), catalog.document],
    ...catalog.actors.map((actor): [string, EmittedArtifact] => [
      payloadPath(actor.slug),
      toActorPayload(actor),
    ]),
    ...catalog.events.map((event): [string, EmittedArtifact] => [
      payloadPath(event.slug),
      toEventPayload(event),
    ]),
    ...catalog.events.map((event): [string, EmittedArtifact] => [
      attributesPath(event.slug),
      toAttributeDictionary(event),
    ]),
  ]);
