import { createStubFromSchema } from '@carrot-fndn/shared/testing';

import { BoldDocumentSchema } from './document.types';

describe('BoldDocumentSchema', () => {
  it('should reject empty category', () => {
    const stub = createStubFromSchema(BoldDocumentSchema);

    expect(
      BoldDocumentSchema.safeParse({ ...stub, category: '' }).success,
    ).toBe(false);
  });

  it('should reject empty subtype when present', () => {
    const stub = createStubFromSchema(BoldDocumentSchema);

    expect(BoldDocumentSchema.safeParse({ ...stub, subtype: '' }).success).toBe(
      false,
    );
  });

  it('should reject empty type when present', () => {
    const stub = createStubFromSchema(BoldDocumentSchema);

    expect(BoldDocumentSchema.safeParse({ ...stub, type: '' }).success).toBe(
      false,
    );
  });

  it('should reject invalid status', () => {
    const stub = createStubFromSchema(BoldDocumentSchema);

    expect(
      BoldDocumentSchema.safeParse({ ...stub, status: 'INVALID_STATUS' })
        .success,
    ).toBe(false);
  });

  it('should reject invalid dataSetName', () => {
    const stub = createStubFromSchema(BoldDocumentSchema);

    expect(
      BoldDocumentSchema.safeParse({ ...stub, dataSetName: 'STAGING' }).success,
    ).toBe(false);
  });

  it('should preserve extra properties (looseObject passthrough)', () => {
    const stub = createStubFromSchema(BoldDocumentSchema);
    const result = BoldDocumentSchema.safeParse({
      ...stub,
      unknownProp: 'preserved',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toHaveProperty('unknownProp');
  });
});
