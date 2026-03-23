import { createStubFromSchema } from '@carrot-fndn/shared/testing';

import {
  DocumentEventAttributeSchema,
  DocumentEventSchema,
  DocumentRelationSchema,
} from './document-event.types';

describe('DocumentEventAttributeSchema', () => {
  it('should reject empty name', () => {
    const stub = createStubFromSchema(DocumentEventAttributeSchema, {
      name: '',
    });

    expect(DocumentEventAttributeSchema.safeParse(stub).success).toBe(false);
  });
});

describe('DocumentRelationSchema', () => {
  it('should reject empty category when present', () => {
    const stub = createStubFromSchema(DocumentRelationSchema);

    expect(
      DocumentRelationSchema.safeParse({ ...stub, category: '' }).success,
    ).toBe(false);
  });

  it('should reject empty subtype when present', () => {
    const stub = createStubFromSchema(DocumentRelationSchema);

    expect(
      DocumentRelationSchema.safeParse({ ...stub, subtype: '' }).success,
    ).toBe(false);
  });

  it('should reject empty type when present', () => {
    const stub = createStubFromSchema(DocumentRelationSchema);

    expect(
      DocumentRelationSchema.safeParse({ ...stub, type: '' }).success,
    ).toBe(false);
  });
});

describe('DocumentEventSchema', () => {
  it('should reject empty name', () => {
    const stub = createStubFromSchema(DocumentEventSchema);

    expect(DocumentEventSchema.safeParse({ ...stub, name: '' }).success).toBe(
      false,
    );
  });

  it('should preserve extra properties (looseObject passthrough)', () => {
    const stub = createStubFromSchema(DocumentEventSchema);
    const result = DocumentEventSchema.safeParse({
      ...stub,
      customField: 'custom-value',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toHaveProperty(
      'customField',
      'custom-value',
    );
  });
});
