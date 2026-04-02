import { createStubFromSchema } from '@carrot-fndn/shared/testing';

import {
  BoldDocumentEventAttributeSchema,
  BoldDocumentEventSchema,
  BoldDocumentRelationSchema,
} from './document-event.types';

describe('BoldDocumentEventAttributeSchema', () => {
  it('should reject empty name', () => {
    const stub = createStubFromSchema(BoldDocumentEventAttributeSchema, {
      name: '',
    });

    expect(BoldDocumentEventAttributeSchema.safeParse(stub).success).toBe(
      false,
    );
  });
});

describe('BoldDocumentRelationSchema', () => {
  it.each(['category', 'subtype', 'type'] as const)(
    'should reject empty %s when present',
    (field) => {
      const stub = createStubFromSchema(BoldDocumentRelationSchema);

      expect(
        BoldDocumentRelationSchema.safeParse({ ...stub, [field]: '' }).success,
      ).toBe(false);
    },
  );
});

describe('BoldDocumentEventSchema', () => {
  it('should reject empty name', () => {
    const stub = createStubFromSchema(BoldDocumentEventSchema);

    expect(
      BoldDocumentEventSchema.safeParse({ ...stub, name: '' }).success,
    ).toBe(false);
  });

  it('should strip unknown fields (z.object default behavior)', () => {
    const stub = createStubFromSchema(BoldDocumentEventSchema);
    const result = BoldDocumentEventSchema.safeParse({
      ...stub,
      customField: 'should-be-stripped',
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    expect(result.data).not.toHaveProperty('customField');
  });
});
