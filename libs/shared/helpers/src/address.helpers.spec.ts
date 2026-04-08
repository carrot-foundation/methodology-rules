import type { DocumentAddress } from '@carrot-fndn/shared/types';

import { hasAddressCoordinates } from './address.helpers';

const baseAddress: DocumentAddress = {
  city: 'São Paulo',
  countryCode: 'BR',
  countryState: 'SP',
  id: 'addr-1',
  latitude: -23.5505,
  longitude: -46.6333,
  neighborhood: 'Centro',
  number: '100',
  participantId: 'participant-1',
  piiSnapshotId: 'pii-1',
  street: 'Rua Exemplo',
  zipCode: '01000-000',
};

describe('hasAddressCoordinates', () => {
  it('returns true when both latitude and longitude are numbers', () => {
    expect(hasAddressCoordinates(baseAddress)).toBe(true);
  });

  it('returns false when latitude is undefined', () => {
    const address: DocumentAddress = {
      ...baseAddress,
      // @ts-expect-error — schema currently requires latitude; this directive
      // will become unused (and therefore an error) once the optional-coordinates
      // schema change lands, at which point it must be removed.
      latitude: undefined,
    };

    expect(hasAddressCoordinates(address)).toBe(false);
  });

  it('returns false when longitude is undefined', () => {
    const address: DocumentAddress = {
      ...baseAddress,
      // @ts-expect-error — schema currently requires longitude; this directive
      // will become unused (and therefore an error) once the optional-coordinates
      // schema change lands, at which point it must be removed.
      longitude: undefined,
    };

    expect(hasAddressCoordinates(address)).toBe(false);
  });

  it('returns false when both coordinates are undefined', () => {
    const address: DocumentAddress = {
      ...baseAddress,
      // @ts-expect-error — see note above; remove with schema change.
      latitude: undefined,
      // @ts-expect-error — see note above; remove with schema change.
      longitude: undefined,
    };

    expect(hasAddressCoordinates(address)).toBe(false);
  });

  it('narrows the type within a truthy branch', () => {
    const address: DocumentAddress = baseAddress;

    // Runtime: the guard must return true for a fully populated address.
    expect(hasAddressCoordinates(address)).toBe(true);
  });
});
