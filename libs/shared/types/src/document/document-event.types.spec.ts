import {
  DocumentAuthorSchema,
  DocumentParticipantSchema,
  isApprovedExceptionAttributeValue,
} from './index';

describe('DocumentParticipantSchema', () => {
  const validParticipant = {
    countryCode: 'BR',
    id: 'participant-1',
    name: 'Test Participant',
    piiSnapshotId: 'pii-1',
    taxId: '12345678901',
    taxIdType: 'CPF',
    type: 'ACTOR',
  };

  it('should accept a valid participant', () => {
    expect(DocumentParticipantSchema.safeParse(validParticipant).success).toBe(
      true,
    );
  });

  it('should reject a participant with empty required fields', () => {
    expect(
      DocumentParticipantSchema.safeParse({ ...validParticipant, id: '' })
        .success,
    ).toBe(false);
  });

  it('should accept optional businessName', () => {
    const result = DocumentParticipantSchema.safeParse({
      ...validParticipant,
      businessName: 'Acme Corp',
    });

    expect(result.success).toBe(true);
  });
});

describe('DocumentAuthorSchema', () => {
  it('should reject invalid dataSetName', () => {
    expect(
      DocumentAuthorSchema.safeParse({
        clientId: 'client-1',
        dataSetName: 'INVALID',
        participantId: 'participant-1',
      }).success,
    ).toBe(false);
  });

  it('should accept valid author', () => {
    expect(
      DocumentAuthorSchema.safeParse({
        clientId: 'client-1',
        dataSetName: 'TEST',
        participantId: 'participant-1',
      }).success,
    ).toBe(true);
  });
});

describe('isApprovedExceptionAttributeValue', () => {
  it('should return true for a valid approved exception array', () => {
    const valid = [
      {
        'Attribute Location': {
          Asset: { Category: 'MassID' },
          Event: 'Weighing',
        },
        'Attribute Name': 'Tare',
        'Exception Type': 'Exemption for Mandatory Attribute',
        Reason: 'Test reason',
      },
    ];

    expect(isApprovedExceptionAttributeValue(valid)).toBe(true);
  });

  it('should return false for invalid input', () => {
    expect(isApprovedExceptionAttributeValue('not-an-array')).toBe(false);
    expect(isApprovedExceptionAttributeValue([{ invalid: true }])).toBe(false);
  });
});
