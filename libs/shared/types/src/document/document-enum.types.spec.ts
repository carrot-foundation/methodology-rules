import {
  DataSetName,
  DataSetNameSchema,
  DocumentEventAttributeFormat,
  DocumentEventAttributeFormatSchema,
  DocumentStatus,
  DocumentStatusSchema,
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
