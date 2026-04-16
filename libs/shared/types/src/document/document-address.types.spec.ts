import {
  DocumentAddressSchema,
  DocumentAddressWithCoordinatesSchema,
} from './document-address.types';

const baseAddress = {
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

const without = (key: keyof typeof baseAddress): Partial<typeof baseAddress> =>
  Object.fromEntries(Object.entries(baseAddress).filter(([k]) => k !== key));

describe('DocumentAddressSchema', () => {
  it.each([
    {
      expected: true,
      scenario: 'a fully populated address',
      value: baseAddress,
    },
    {
      expected: true,
      scenario: 'an address without latitude',
      value: without('latitude'),
    },
    {
      expected: true,
      scenario: 'an address without longitude',
      value: without('longitude'),
    },
    {
      expected: true,
      scenario: 'an address without zipCode',
      value: without('zipCode'),
    },
    {
      expected: true,
      scenario: 'an address without neighborhood',
      value: without('neighborhood'),
    },
    {
      expected: false,
      scenario: 'an address without city',
      value: without('city'),
    },
    {
      expected: false,
      scenario: 'an address without countryCode',
      value: without('countryCode'),
    },
    {
      expected: false,
      scenario: 'an out-of-range latitude when provided',
      value: { ...baseAddress, latitude: 200 },
    },
  ])('returns success=$expected for $scenario', ({ expected, value }) => {
    const result = DocumentAddressSchema.safeParse(value);

    expect(result.success).toBe(expected);
  });
});

describe('DocumentAddressWithCoordinatesSchema', () => {
  it.each([
    {
      expected: true,
      scenario: 'a fully populated address',
      value: baseAddress,
    },
    {
      expected: true,
      scenario: 'an address without zipCode',
      value: without('zipCode'),
    },
    {
      expected: false,
      scenario: 'an address without latitude',
      value: without('latitude'),
    },
    {
      expected: false,
      scenario: 'an address without longitude',
      value: without('longitude'),
    },
  ])('returns success=$expected for $scenario', ({ expected, value }) => {
    const result = DocumentAddressWithCoordinatesSchema.safeParse(value);

    expect(result.success).toBe(expected);
  });
});
