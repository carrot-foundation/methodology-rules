import { createStubFromSchema } from '@carrot-fndn/shared/testing';

import { DocumentSchema } from './document.types';

describe('DocumentSchema', () => {
  it('should reject empty category', () => {
    const stub = createStubFromSchema(DocumentSchema);

    expect(DocumentSchema.safeParse({ ...stub, category: '' }).success).toBe(
      false,
    );
  });

  it('should reject empty subtype when present', () => {
    const stub = createStubFromSchema(DocumentSchema);

    expect(DocumentSchema.safeParse({ ...stub, subtype: '' }).success).toBe(
      false,
    );
  });

  it('should reject empty type when present', () => {
    const stub = createStubFromSchema(DocumentSchema);

    expect(DocumentSchema.safeParse({ ...stub, type: '' }).success).toBe(false);
  });

  it('should reject invalid status', () => {
    const stub = createStubFromSchema(DocumentSchema);

    expect(
      DocumentSchema.safeParse({ ...stub, status: 'INVALID_STATUS' }).success,
    ).toBe(false);
  });

  it('should reject invalid dataSetName', () => {
    const stub = createStubFromSchema(DocumentSchema);

    expect(
      DocumentSchema.safeParse({ ...stub, dataSetName: 'STAGING' }).success,
    ).toBe(false);
  });

  it('should preserve extra properties (looseObject passthrough)', () => {
    const stub = createStubFromSchema(DocumentSchema);
    const result = DocumentSchema.safeParse({
      ...stub,
      unknownProp: 'preserved',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toHaveProperty(
      'unknownProp',
      'preserved',
    );
  });
});
