import {
  BoldAttributeName,
  BoldDocumentEventName,
} from '@carrot-fndn/shared/methodologies/bold/types';

import {
  EVENT_PRIVACY_SPEC,
  OPEN_ACTOR_LABELS,
  SKIPPED_ACTOR_LABELS,
  SKIPPED_EVENT_NAMES,
} from './privacy-flags.constants';

const { PICK_UP, WEIGHING } = BoldDocumentEventName;
const { DRIVER_IDENTIFIER, VEHICLE_LICENSE_PLATE } = BoldAttributeName;

const sortAlphabetically = (a: string, b: string): number => a.localeCompare(b);

describe('privacy-flags constants', () => {
  it('should specify exactly the seven methodology events', () => {
    expect([...EVENT_PRIVACY_SPEC.keys()].sort(sortAlphabetically)).toEqual([
      'Drop-off',
      'Pick-up',
      'Recycled',
      'Recycling Manifest',
      'Sorting',
      'Transport Manifest',
      'Weighing',
    ]);
  });

  it('should expect every specified event and attribute to be public', () => {
    for (const eventSpec of EVENT_PRIVACY_SPEC.values()) {
      expect(eventSpec.isPublic).toBe(true);

      for (const attributeSpec of eventSpec.attributes.values()) {
        expect(attributeSpec.isPublic).toBe(true);
      }
    }
  });

  it('should mark the vehicle license plate as sensitive on Pick-up and Weighing', () => {
    expect(
      EVENT_PRIVACY_SPEC.get(PICK_UP)?.attributes.get(VEHICLE_LICENSE_PLATE),
    ).toEqual({ isPublic: true, sensitive: true });
    expect(
      EVENT_PRIVACY_SPEC.get(WEIGHING)?.attributes.get(VEHICLE_LICENSE_PLATE),
    ).toEqual({ isPublic: true, sensitive: true });
  });

  it('should mark the driver identifier as sensitive on Pick-up', () => {
    expect(
      EVENT_PRIVACY_SPEC.get(PICK_UP)?.attributes.get(DRIVER_IDENTIFIER),
    ).toEqual({ isPublic: true, sensitive: true });
  });

  it('should treat only Processor and Recycler as open actors', () => {
    expect([...OPEN_ACTOR_LABELS].sort(sortAlphabetically)).toEqual([
      'Processor',
      'Recycler',
    ]);
  });

  it('should skip the internal actors and the rule-execution outputs', () => {
    expect([...SKIPPED_ACTOR_LABELS].sort(sortAlphabetically)).toEqual([
      'Integrator',
      'METHODOLOGY PLATFORM',
    ]);
    expect([...SKIPPED_EVENT_NAMES].sort(sortAlphabetically)).toEqual([
      'GasID',
      'MassID Audit (BOLD Carbon)',
      'MassID Audit (BOLD Recycling)',
      'RecycledID',
    ]);
  });
});
