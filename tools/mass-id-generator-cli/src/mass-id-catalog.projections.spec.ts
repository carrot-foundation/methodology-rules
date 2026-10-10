import {
  BoldDocumentEventName,
  MassIDActorType,
} from '@carrot-fndn/shared/methodologies/bold/types';

import type { CatalogActor, CatalogEvent } from './mass-id-catalog.types';

import { MASS_ID_CATALOG } from './mass-id-catalog';
import {
  toActorPayload,
  toAttributeDictionary,
  toEventPayload,
  toEventsManifest,
  toMethodologyFiles,
} from './mass-id-catalog.projections';

const { PICK_UP, RECYCLING_MANIFEST, SORTING, TRANSPORT_MANIFEST, WEIGHING } =
  BoldDocumentEventName;

const PLACEHOLDER_UUID = /^00000000-0000-4000-[89]000-[\da-f]{12}$/;
const UUID_SHAPED = /[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/gi;

const MANIFEST_ROWS = [
  ['Create MassID document', 'create-mass-id'],
  ['ACTOR:Waste Generator', 'actor-waste-generator'],
  ['ACTOR:Recycler', 'actor-recycler'],
  ['ACTOR:Processor', 'actor-processor'],
  ['ACTOR:Hauler', 'actor-hauler'],
  ['ACTOR:Integrator', 'actor-integrator'],
  ['Pick-up', 'pick-up'],
  ['Transport Manifest', 'transport-manifest'],
  ['Weighing', 'weighing'],
  ['Drop-off', 'drop-off'],
  ['Sorting', 'sorting'],
  ['Recycled', 'recycled'],
  ['Recycling Manifest', 'recycling-manifest'],
] as const;

const CUSTOM_EVENT_SLUGS = new Set<string>(
  MASS_ID_CATALOG.events.map(({ slug }) => slug),
);

const findEvent = (eventName: string): CatalogEvent => {
  const catalogEvent = MASS_ID_CATALOG.events.find(
    ({ name }) => name === eventName,
  );

  if (catalogEvent === undefined) {
    throw new Error(`Catalog has no "${eventName}" event`);
  }

  return catalogEvent;
};

const findActor = (label: string): CatalogActor => {
  const catalogActor = MASS_ID_CATALOG.actors.find(
    (actor) => actor.label === label,
  );

  if (catalogActor === undefined) {
    throw new Error(`Catalog has no "${label}" actor`);
  }

  return catalogActor;
};

describe('mass-id-catalog projections', () => {
  describe('toEventPayload', () => {
    it('should project the Pick-up event with the privacy flags the rule requires', () => {
      expect(toEventPayload(findEvent(PICK_UP))).toStrictEqual({
        addressId: '00000000-0000-4000-9000-00000000000a',
        externalCreatedAt: '2024-12-05T11:02:47Z',
        isPublic: true,
        metadata: {
          attributes: [
            {
              isPublic: true,
              name: 'Description',
              value: 'Waste picked up at the waste generator site',
            },
            {
              isPublic: true,
              name: 'Local Waste Classification ID',
              value: '02 01 03',
            },
            {
              isPublic: true,
              name: 'Local Waste Classification Description',
              value: 'Resíduos de tecidos vegetais',
            },
            {
              isPublic: true,
              name: 'Vehicle License Plate',
              sensitive: true,
              value: 'ABC1D23',
            },
            { isPublic: true, name: 'Vehicle Type', value: 'Truck' },
            {
              isPublic: true,
              name: 'Driver Identifier',
              sensitive: true,
              value: '00000000-0000-4000-8000-00000000d21f',
            },
          ],
        },
        name: 'Pick-up',
        participantId: '00000000-0000-4000-8000-00000000000a',
      });
    });

    it('should keep the published key order on events and attributes', () => {
      const payload = toEventPayload(findEvent(TRANSPORT_MANIFEST));
      const attributes = payload.metadata?.attributes ?? [];

      expect(Object.keys(payload)).toStrictEqual([
        'externalCreatedAt',
        'isPublic',
        'addressId',
        'name',
        'participantId',
        'value',
        'metadata',
        'attachments',
      ]);
      expect(
        attributes.map((attribute) => Object.keys(attribute)),
      ).toContainEqual(['format', 'isPublic', 'name', 'value']);
      expect(
        (toEventPayload(findEvent(PICK_UP)).metadata?.attributes ?? []).map(
          (attribute) => Object.keys(attribute),
        ),
      ).toContainEqual(['sensitive', 'isPublic', 'name', 'value']);
    });

    it('should emit an attribute the privacy table does not list as public without a sensitive key', () => {
      const { metadata } = toEventPayload(findEvent(WEIGHING));

      expect(metadata?.attributes).toContainEqual({
        isPublic: true,
        name: 'Container Quantity',
        value: 1,
      });
    });

    it('should emit the Weighing vehicle plate as public and masked', () => {
      const { metadata } = toEventPayload(findEvent(WEIGHING));

      expect(metadata?.attributes).toContainEqual({
        isPublic: true,
        name: 'Vehicle License Plate',
        sensitive: true,
        value: 'ABC1D23',
      });
    });

    it('should leave out the attributes that have no example', () => {
      const pickUp = findEvent(PICK_UP);
      const exampleNames = pickUp.attributes
        .filter(({ example }) => example !== undefined)
        .map(({ name }) => name);

      expect(exampleNames.length).toBeLessThan(pickUp.attributes.length);
      expect(
        toEventPayload(pickUp).metadata?.attributes.map(({ name }) => name),
      ).toStrictEqual(exampleNames);
    });

    it('should throw for an event the privacy table does not know', () => {
      expect(() =>
        toEventPayload({
          ...findEvent(PICK_UP),
          name: BoldDocumentEventName.NOTICE,
        }),
      ).toThrow('No privacy spec for event "NOTICE"');
    });
  });

  describe('toActorPayload', () => {
    it.each([
      { label: MassIDActorType.WASTE_GENERATOR, preserveSensitiveData: true },
      { label: MassIDActorType.RECYCLER, preserveSensitiveData: false },
    ])(
      'should project the $label actor with preserveSensitiveData $preserveSensitiveData',
      ({ label, preserveSensitiveData }) => {
        const actor = findActor(label);
        const payload = toActorPayload(actor);

        expect(payload).toStrictEqual({
          addressId: actor.addressId,
          externalCreatedAt: '2024-12-05T11:02:47Z',
          isPublic: true,
          label,
          name: 'ACTOR',
          participantId: actor.participantId,
          preserveSensitiveData,
        });
        expect(Object.keys(payload)).toStrictEqual([
          'externalCreatedAt',
          'isPublic',
          'preserveSensitiveData',
          'addressId',
          'label',
          'name',
          'participantId',
        ]);
      },
    );

    it('should throw for a role the participant privacy table does not know', () => {
      expect(() =>
        toActorPayload({
          ...findActor(MassIDActorType.HAULER),
          label: 'Unknown Role' as MassIDActorType,
        }),
      ).toThrow('No participant privacy spec for actor "Unknown Role"');
    });
  });

  describe('toAttributeDictionary', () => {
    it('should carry the authored fields and the visibility the privacy table gives', () => {
      const { attributes } = toAttributeDictionary(findEvent(PICK_UP));

      expect(attributes).toContainEqual({
        name: 'Vehicle License Plate',
        notes: expect.any(String),
        required: 'yes',
        valueType: 'string',
        visibility: { isPublic: true, sensitive: true },
      });
      expect(attributes).toContainEqual(
        expect.objectContaining({
          allowedValues: expect.arrayContaining(['Truck', 'Sludge Pipes']),
          name: 'Vehicle Type',
          visibility: { isPublic: true, sensitive: false },
        }),
      );
    });

    it('should omit visibility for an attribute the privacy table does not list', () => {
      const { attributes } = toAttributeDictionary(findEvent(WEIGHING));
      const containerQuantity = attributes.find(
        ({ name }) => name === 'Container Quantity',
      );

      expect(containerQuantity).toBeDefined();
      expect(containerQuantity).not.toHaveProperty('visibility');
      expect(containerQuantity).not.toHaveProperty('example');
    });

    it('should carry the format and the value list each event authors', () => {
      expect(
        toAttributeDictionary(findEvent(SORTING)).attributes,
      ).toContainEqual(
        expect.objectContaining({ format: 'KILOGRAM', name: 'Gross Weight' }),
      );
      expect(
        toAttributeDictionary(findEvent(TRANSPORT_MANIFEST)).attributes,
      ).toContainEqual(
        expect.objectContaining({
          allowedValues: ['MTR'],
          name: 'Document Type',
        }),
      );
      expect(
        toAttributeDictionary(findEvent(RECYCLING_MANIFEST)).attributes,
      ).toContainEqual(
        expect.objectContaining({
          allowedValues: ['CDF'],
          name: 'Document Type',
        }),
      );
    });

    it('should list every catalog attribute, with or without an example', () => {
      const pickUp = findEvent(PICK_UP);

      expect(
        toAttributeDictionary(pickUp).attributes.map(({ name }) => name),
      ).toStrictEqual(pickUp.attributes.map(({ name }) => name));
    });
  });

  describe('toEventsManifest', () => {
    it('should list the thirteen entries in order, with an attributes artifact on the custom events only', () => {
      expect(toEventsManifest(MASS_ID_CATALOG)).toStrictEqual({
        events: MANIFEST_ROWS.map(([name, slug], order) => ({
          artifacts: {
            ...(CUSTOM_EVENT_SLUGS.has(slug) && {
              attributes: `events/${slug}/attributes.json`,
            }),
            payload: `events/${slug}/payload.json`,
          },
          name,
          order,
          slug,
        })),
        schemaVersion: 1,
      });
    });
  });

  describe('toMethodologyFiles', () => {
    it('should map the manifest, one payload per entry and one dictionary per custom event', () => {
      expect([...toMethodologyFiles(MASS_ID_CATALOG).keys()]).toStrictEqual([
        'events-manifest.json',
        ...MANIFEST_ROWS.map(([, slug]) => `events/${slug}/payload.json`),
        ...[...CUSTOM_EVENT_SLUGS].map(
          (slug) => `events/${slug}/attributes.json`,
        ),
      ]);
    });

    it('should emit the create-mass-id body with alphabetical keys', () => {
      const body = toMethodologyFiles(MASS_ID_CATALOG).get(
        'events/create-mass-id/payload.json',
      );

      expect(body).toStrictEqual(MASS_ID_CATALOG.document);
      expect(Object.keys(body ?? {})).toStrictEqual([
        'addressId',
        'category',
        'externalCreatedAt',
        'isPublic',
        'isPubliclySearchable',
        'participantId',
        'subtype',
        'title',
        'type',
      ]);
    });

    it('should emit only placeholder UUIDs', () => {
      const emittedUuids =
        JSON.stringify([...toMethodologyFiles(MASS_ID_CATALOG).values()]).match(
          UUID_SHAPED,
        ) ?? [];

      expect(emittedUuids.length).toBeGreaterThan(0);
      expect(
        emittedUuids.filter((uuid) => !PLACEHOLDER_UUID.test(uuid)),
      ).toStrictEqual([]);
    });
  });
});
