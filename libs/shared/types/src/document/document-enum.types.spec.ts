import {
  ActorType,
  ActorTypeSchema,
  DataSetName,
  DataSetNameSchema,
  DocumentEventAttributeFormat,
  DocumentEventAttributeFormatSchema,
  DocumentEventAttributeType,
  DocumentEventAttributeTypeSchema,
  DocumentStatus,
  DocumentStatusSchema,
  DocumentType,
  DocumentTypeSchema,
  EvaluationResult,
  EvaluationResultSchema,
  MassIDLikeDocumentTypeSchema,
  ParticipantType,
  ParticipantTypeSchema,
} from './document-enum.types';

describe('DataSetNameSchema', () => {
  it.each(['PROD', 'PROD_SIMULATION', 'TEST'])('should accept %s', (value) => {
    expect(DataSetNameSchema.parse(value)).toBe(value);
  });

  it('should provide dot-notation access', () => {
    expect(DataSetName.PROD).toBe('PROD');
  });

  it('should reject invalid values', () => {
    expect(DataSetNameSchema.safeParse('INVALID').success).toBe(false);
  });
});

describe('DocumentStatusSchema', () => {
  it.each(['CANCELLED', 'CLOSED', 'OPEN'])('should accept %s', (value) => {
    expect(DocumentStatusSchema.parse(value)).toBe(value);
  });

  it('should provide dot-notation access', () => {
    expect(DocumentStatus.OPEN).toBe('OPEN');
  });

  it('should reject invalid values', () => {
    expect(DocumentStatusSchema.safeParse('DRAFT').success).toBe(false);
  });
});

describe('DocumentEventAttributeFormatSchema', () => {
  it.each(['CUBIC_METER', 'DATE', 'KILOGRAM', 'LITER'])(
    'should accept %s',
    (value) => {
      expect(DocumentEventAttributeFormatSchema.parse(value)).toBe(value);
    },
  );

  it('should provide dot-notation access', () => {
    expect(DocumentEventAttributeFormat.KILOGRAM).toBe('KILOGRAM');
  });

  it('should reject invalid values', () => {
    expect(DocumentEventAttributeFormatSchema.safeParse('POUND').success).toBe(
      false,
    );
  });
});

describe('DocumentEventAttributeTypeSchema', () => {
  it('should accept REFERENCE', () => {
    expect(DocumentEventAttributeTypeSchema.parse('REFERENCE')).toBe(
      'REFERENCE',
    );
  });

  it('should provide dot-notation access', () => {
    expect(DocumentEventAttributeType.REFERENCE).toBe('REFERENCE');
  });

  it('should reject invalid values', () => {
    expect(DocumentEventAttributeTypeSchema.safeParse('LINK').success).toBe(
      false,
    );
  });
});

describe('EvaluationResultSchema', () => {
  it('should accept PASSED', () => {
    expect(EvaluationResultSchema.parse('PASSED')).toBe('PASSED');
  });

  it('should provide dot-notation access', () => {
    expect(EvaluationResult.PASSED).toBe('PASSED');
  });

  it('should reject invalid values', () => {
    expect(EvaluationResultSchema.safeParse('FAILED').success).toBe(false);
  });
});

describe('ParticipantTypeSchema', () => {
  it('should accept ACTOR', () => {
    expect(ParticipantTypeSchema.parse('ACTOR')).toBe('ACTOR');
  });

  it('should provide dot-notation access', () => {
    expect(ParticipantType.ACTOR).toBe('ACTOR');
  });

  it('should reject invalid values', () => {
    expect(ParticipantTypeSchema.safeParse('USER').success).toBe(false);
  });
});

describe('DocumentTypeSchema', () => {
  it('should parse known document type values', () => {
    expect(DocumentTypeSchema.parse(DocumentType.ORGANIC)).toBe('Organic');
    expect(DocumentTypeSchema.parse(DocumentType.GAS_ID)).toBe('GasID');
  });

  it('should reject values not in the document type set', () => {
    expect(DocumentTypeSchema.safeParse('Unknown Type').success).toBe(false);
  });
});

describe('MassIDLikeDocumentTypeSchema', () => {
  it('should accept all MassID-family document types', () => {
    expect(MassIDLikeDocumentTypeSchema.parse(DocumentType.ORGANIC)).toBe(
      'Organic',
    );
    expect(MassIDLikeDocumentTypeSchema.parse(DocumentType.GAS_ID)).toBe(
      'GasID',
    );
    expect(MassIDLikeDocumentTypeSchema.parse(DocumentType.RECYCLED_ID)).toBe(
      'RecycledID',
    );
  });

  it('should reject document types outside the MassID family', () => {
    expect(
      MassIDLikeDocumentTypeSchema.safeParse(DocumentType.DEFINITION).success,
    ).toBe(false);
    expect(
      MassIDLikeDocumentTypeSchema.safeParse(DocumentType.CREDIT_ORDER).success,
    ).toBe(false);
  });
});

describe('ActorTypeSchema', () => {
  it('should parse actor type values from the const object', () => {
    expect(ActorTypeSchema.parse(ActorType.RECYCLER)).toBe('Recycler');
    expect(ActorTypeSchema.parse(ActorType.HAULER)).toBe('Hauler');
  });

  it('should reject values not in the actor type set', () => {
    expect(ActorTypeSchema.safeParse('Unknown Actor').success).toBe(false);
  });
});
