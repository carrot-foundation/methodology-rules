import { createStubFromSchema } from '@carrot-fndn/shared/testing';

import {
  MethodologyAuthorSchema,
  MethodologyParticipantSchema,
} from './methodology-participant.types';

describe('MethodologyParticipantSchema', () => {
  const validParticipant = createStubFromSchema(MethodologyParticipantSchema);

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
  const validAuthor = createStubFromSchema(MethodologyAuthorSchema);

  it('should reject invalid dataSetName', () => {
    expect(
      MethodologyAuthorSchema.safeParse({
        ...validAuthor,
        dataSetName: 'INVALID',
      }).success,
    ).toBe(false);
  });
});
