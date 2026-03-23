import {
  MethodologyAuthorSchema,
  MethodologyParticipantSchema,
} from './methodology-participant.types';

describe('MethodologyParticipantSchema', () => {
  const validParticipant = {
    countryCode: 'BR',
    id: 'participant-123',
    name: 'Test Participant',
    piiSnapshotId: 'pii-snapshot-456',
    taxId: '12345678000100',
    taxIdType: 'CNPJ',
    type: 'ACTOR',
  };

  it('should accept participant with non-ACTOR type (polymorphic)', () => {
    expect(
      MethodologyParticipantSchema.safeParse({
        ...validParticipant,
        type: 'Hauler',
      }).success,
    ).toBe(true);
  });

  it('should preserve extra properties (looseObject)', () => {
    const result = MethodologyParticipantSchema.safeParse({
      ...validParticipant,
      extraField: 'extra-value',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toHaveProperty(
      'extraField',
      'extra-value',
    );
  });

  it('should reject empty string for required fields', () => {
    expect(
      MethodologyParticipantSchema.safeParse({
        ...validParticipant,
        id: '',
      }).success,
    ).toBe(false);
  });
});

describe('MethodologyAuthorSchema', () => {
  const validAuthor = {
    clientId: 'client-123',
    dataSetName: 'PROD',
    participantId: 'participant-456',
  };

  it('should reject invalid dataSetName', () => {
    expect(
      MethodologyAuthorSchema.safeParse({
        ...validAuthor,
        dataSetName: 'INVALID',
      }).success,
    ).toBe(false);
  });
});
