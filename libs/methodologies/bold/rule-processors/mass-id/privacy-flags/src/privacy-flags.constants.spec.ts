import {
  ASSERTABLE_ACTOR_LABELS,
  EVENT_PRIVACY_SPEC,
  PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC,
  SKIPPED_EVENT_NAMES,
} from './privacy-flags.constants';

const sortAlphabetically = (a: string, b: string): number => a.localeCompare(b);

describe('privacy-flags constants', () => {
  it('should specify the exact privacy spec for every methodology event and attribute', () => {
    expect(
      Object.fromEntries(
        [...EVENT_PRIVACY_SPEC].map(([eventName, eventSpec]) => [
          eventName,
          {
            attributes: Object.fromEntries(eventSpec.attributes),
            isPublic: eventSpec.isPublic,
          },
        ]),
      ),
    ).toEqual({
      'Drop-off': {
        attributes: {
          Description: { isPublic: true, sensitive: false },
          'Receiving Operator Identifier': {
            isPublic: true,
            sensitive: false,
          },
        },
        isPublic: true,
      },
      'Pick-up': {
        attributes: {
          Description: { isPublic: true, sensitive: false },
          'Driver Identifier': { isPublic: true, sensitive: true },
          'Driver Identifier Exemption Justification': {
            isPublic: true,
            sensitive: false,
          },
          'Local Waste Classification Description': {
            isPublic: true,
            sensitive: false,
          },
          'Local Waste Classification ID': {
            isPublic: true,
            sensitive: false,
          },
          'Vehicle License Plate': { isPublic: true, sensitive: true },
          'Vehicle Type': { isPublic: true, sensitive: false },
        },
        isPublic: true,
      },
      Recycled: {
        attributes: {
          Description: { isPublic: true, sensitive: false },
        },
        isPublic: true,
      },
      'Recycling Manifest': {
        attributes: {
          'Document Number': { isPublic: true, sensitive: false },
          'Document Type': { isPublic: true, sensitive: false },
          'Issue Date': { isPublic: true, sensitive: false },
        },
        isPublic: true,
      },
      Sorting: {
        attributes: {
          'Deducted Weight': { isPublic: true, sensitive: false },
          Description: { isPublic: true, sensitive: false },
          'Gross Weight': { isPublic: true, sensitive: false },
        },
        isPublic: true,
      },
      'Transport Manifest': {
        attributes: {
          'Document Number': { isPublic: true, sensitive: false },
          'Document Type': { isPublic: true, sensitive: false },
          'Exemption Justification': { isPublic: true, sensitive: false },
          'Issue Date': { isPublic: true, sensitive: false },
        },
        isPublic: true,
      },
      Weighing: {
        attributes: {
          'Container Type': { isPublic: true, sensitive: false },
          Description: { isPublic: true, sensitive: false },
          'Gross Weight': { isPublic: true, sensitive: false },
          'Scale Type': { isPublic: true, sensitive: false },
          Tare: { isPublic: true, sensitive: false },
          'Vehicle License Plate': { isPublic: true, sensitive: true },
          'Weighing Capture Method': { isPublic: true, sensitive: false },
        },
        isPublic: true,
      },
    });
  });

  it('should specify preserveSensitiveData by participant role', () => {
    expect(
      Object.fromEntries(PARTICIPANT_PRESERVE_SENSITIVE_DATA_SPEC),
    ).toEqual({
      Hauler: true,
      Processor: false,
      Recycler: false,
      'Waste Generator': true,
    });
  });

  it('should assert privacy flags only for the Hauler, Processor, Recycler, and Waste Generator actors', () => {
    expect([...ASSERTABLE_ACTOR_LABELS].sort(sortAlphabetically)).toEqual([
      'Hauler',
      'Processor',
      'Recycler',
      'Waste Generator',
    ]);
  });

  it('should skip the rule-execution outputs', () => {
    expect([...SKIPPED_EVENT_NAMES].sort(sortAlphabetically)).toEqual([
      'GasID',
      'MassID Audit (BOLD Carbon)',
      'MassID Audit (BOLD Recycling)',
      'RecycledID',
    ]);
  });
});
