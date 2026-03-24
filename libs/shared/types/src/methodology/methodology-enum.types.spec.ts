import {
  DataSetNameSchema,
  MethodologyDocumentEventAttributeFormatSchema,
  MethodologyDocumentEventAttributeTypeSchema,
  MethodologyDocumentStatusSchema,
  MethodologyEvaluationResultSchema,
  MethodologyParticipantTypeSchema,
} from './methodology-enum.types';

describe('MethodologyParticipantTypeSchema', () => {
  it('should accept ACTOR', () => {
    expect(MethodologyParticipantTypeSchema.safeParse('ACTOR').success).toBe(
      true,
    );
  });

  it.each(['INVALID', '', 123, null])(
    'should reject invalid value: %s',
    (value) => {
      expect(MethodologyParticipantTypeSchema.safeParse(value).success).toBe(
        false,
      );
    },
  );
});

describe('DataSetNameSchema', () => {
  it.each(['PROD', 'PROD_SIMULATION', 'TEST'])(
    'should accept valid value: %s',
    (value) => {
      expect(DataSetNameSchema.safeParse(value).success).toBe(true);
    },
  );

  it('should reject invalid value', () => {
    expect(DataSetNameSchema.safeParse('STAGING').success).toBe(false);
  });
});

describe('MethodologyDocumentStatusSchema', () => {
  it.each(['CANCELLED', 'CLOSED', 'OPEN'])(
    'should accept valid value: %s',
    (value) => {
      expect(MethodologyDocumentStatusSchema.safeParse(value).success).toBe(
        true,
      );
    },
  );

  it('should reject invalid value', () => {
    expect(MethodologyDocumentStatusSchema.safeParse('DRAFT').success).toBe(
      false,
    );
  });
});

describe('MethodologyDocumentEventAttributeFormatSchema', () => {
  it.each(['CUBIC_METER', 'DATE', 'KILOGRAM', 'LITER'])(
    'should accept valid value: %s',
    (value) => {
      expect(
        MethodologyDocumentEventAttributeFormatSchema.safeParse(value).success,
      ).toBe(true);
    },
  );

  it('should reject invalid value', () => {
    expect(
      MethodologyDocumentEventAttributeFormatSchema.safeParse('METER').success,
    ).toBe(false);
  });
});

describe('MethodologyDocumentEventAttributeTypeSchema', () => {
  it('should accept REFERENCE', () => {
    expect(
      MethodologyDocumentEventAttributeTypeSchema.safeParse('REFERENCE')
        .success,
    ).toBe(true);
  });

  it('should reject invalid value', () => {
    expect(
      MethodologyDocumentEventAttributeTypeSchema.safeParse('LINK').success,
    ).toBe(false);
  });
});

describe('MethodologyEvaluationResultSchema', () => {
  it('should accept PASSED', () => {
    expect(MethodologyEvaluationResultSchema.safeParse('PASSED').success).toBe(
      true,
    );
  });

  it('should reject invalid value', () => {
    expect(MethodologyEvaluationResultSchema.safeParse('FAILED').success).toBe(
      false,
    );
  });
});
