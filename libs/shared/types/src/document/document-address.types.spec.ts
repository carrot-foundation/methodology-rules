import { DocumentAddressSchema } from './document-address.types';

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
  it('accepts a fully populated address', () => {
    const result = DocumentAddressSchema.safeParse(baseAddress);

    expect(result.success).toBe(true);
  });

  it('accepts an address without latitude', () => {
    const result = DocumentAddressSchema.safeParse(without('latitude'));

    expect(result.success).toBe(true);
  });

  it('accepts an address without longitude', () => {
    const result = DocumentAddressSchema.safeParse(without('longitude'));

    expect(result.success).toBe(true);
  });

  it('accepts an address without zipCode', () => {
    const result = DocumentAddressSchema.safeParse(without('zipCode'));

    expect(result.success).toBe(true);
  });

  it('rejects an address without city (still required)', () => {
    const result = DocumentAddressSchema.safeParse(without('city'));

    expect(result.success).toBe(false);
  });

  it('rejects an address without countryCode (still required)', () => {
    const result = DocumentAddressSchema.safeParse(without('countryCode'));

    expect(result.success).toBe(false);
  });

  it('rejects an out-of-range latitude when provided', () => {
    const result = DocumentAddressSchema.safeParse({
      ...baseAddress,
      latitude: 200,
    });

    expect(result.success).toBe(false);
  });
});
