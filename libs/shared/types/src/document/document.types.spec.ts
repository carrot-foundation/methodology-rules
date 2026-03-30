import {
  DocumentSchema,
  InboundDocumentSchema,
  LoadedDocumentEnvelopeSchema,
} from './index';

const validAddress = {
  city: 'Test City',
  countryCode: 'BR',
  countryState: 'SP',
  id: 'addr-1',
  latitude: -23.5,
  longitude: -46.6,
  neighborhood: 'Test Neighborhood',
  number: '123',
  participantId: 'participant-1',
  piiSnapshotId: 'pii-1',
  street: 'Test Street',
  zipCode: '01000-000',
};

const validParticipant = {
  countryCode: 'BR',
  id: 'participant-1',
  name: 'Test Participant',
  piiSnapshotId: 'pii-1',
  taxId: '12345678901',
  taxIdType: 'CPF',
  type: 'ACTOR',
};

const validInboundDocument = {
  category: 'MassID',
  createdAt: '2026-01-01T00:00:00+00:00',
  currentValue: 100,
  dataSetName: 'TEST',
  externalCreatedAt: '2026-01-01T00:00:00+00:00',
  id: 'doc-1',
  isPubliclySearchable: true,
  measurementUnit: 'kg',
  primaryAddress: validAddress,
  primaryParticipant: validParticipant,
  status: 'OPEN',
  updatedAt: '2026-01-01T00:00:00+00:00',
};

describe('LoadedDocumentEnvelopeSchema', () => {
  it('should compose InboundDocumentSchema as the document field type', () => {
    const result = LoadedDocumentEnvelopeSchema.safeParse({
      createdAt: '2026-01-01T00:00:00+00:00',
      document: validInboundDocument,
      id: 'loaded-doc-1',
      versionDate: '2026-01-01T00:00:00+00:00',
    });

    expect(result.success).toBe(true);
  });

  it('should reject an envelope where the inner document violates InboundDocumentSchema', () => {
    const result = LoadedDocumentEnvelopeSchema.safeParse({
      createdAt: '2026-01-01T00:00:00+00:00',
      document: { invalid: true },
      id: 'loaded-doc-1',
      versionDate: '2026-01-01T00:00:00+00:00',
    });

    expect(result.success).toBe(false);
  });
});

describe('InboundDocumentSchema', () => {
  it('should preserve unknown fields via looseObject', () => {
    const result = InboundDocumentSchema.safeParse({
      ...validInboundDocument,
      transportOnlyField: 'should-survive',
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('transportOnlyField');
  });
});

describe('DocumentSchema', () => {
  it('should strip unknown fields that are not part of the normalized model', () => {
    const result = DocumentSchema.safeParse({
      ...validInboundDocument,
      transportOnlyField: 'should-be-stripped',
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('transportOnlyField');
  });
});
