import {
  DataSetNameSchema,
  MethodologyActorTypeSchema,
  MethodologyApprovedExceptionTypeSchema,
  MethodologyDocumentEventAttributeFormatSchema,
  MethodologyDocumentEventAttributeTypeSchema,
  MethodologyDocumentEventLabelSchema,
  MethodologyDocumentEventNameSchema,
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

describe('MethodologyActorTypeSchema', () => {
  it.each([
    'Auditor',
    'Community Impact Pool',
    'Hauler',
    'Integrator',
    'Methodology Author',
    'Methodology Developer',
    'Network',
    'Processor',
    'Recycler',
    'Remainder',
    'Source',
    'Waste Generator',
  ])('should accept valid actor type: %s', (value) => {
    expect(MethodologyActorTypeSchema.safeParse(value).success).toBe(true);
  });

  it('should reject invalid value', () => {
    expect(MethodologyActorTypeSchema.safeParse('Admin').success).toBe(false);
  });
});

describe('MethodologyApprovedExceptionTypeSchema', () => {
  it('should accept Exemption for Mandatory Attribute', () => {
    expect(
      MethodologyApprovedExceptionTypeSchema.safeParse(
        'Exemption for Mandatory Attribute',
      ).success,
    ).toBe(true);
  });

  it('should reject invalid value', () => {
    expect(
      MethodologyApprovedExceptionTypeSchema.safeParse('Other Exception')
        .success,
    ).toBe(false);
  });
});

describe('MethodologyDocumentEventNameSchema', () => {
  it.each(['ACTOR', 'Drop-off', 'Pick-up', 'Recycled', 'Weighing'])(
    'should accept valid event name: %s',
    (value) => {
      expect(MethodologyDocumentEventNameSchema.safeParse(value).success).toBe(
        true,
      );
    },
  );

  it('should reject invalid value', () => {
    expect(
      MethodologyDocumentEventNameSchema.safeParse('INVALID_EVENT').success,
    ).toBe(false);
  });
});

describe('MethodologyDocumentEventLabelSchema', () => {
  it('should contain exactly the same members as MethodologyActorTypeSchema', () => {
    expect(MethodologyDocumentEventLabelSchema.options).toEqual(
      MethodologyActorTypeSchema.options,
    );
  });

  it.each(['Hauler', 'Recycler', 'Waste Generator'])(
    'should accept valid label: %s',
    (value) => {
      expect(MethodologyDocumentEventLabelSchema.safeParse(value).success).toBe(
        true,
      );
    },
  );

  it('should reject invalid value', () => {
    expect(
      MethodologyDocumentEventLabelSchema.safeParse('INVALID').success,
    ).toBe(false);
  });
});
