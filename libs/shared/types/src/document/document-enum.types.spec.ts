import {
  ActorType,
  ActorTypeSchema,
  DocumentType,
  DocumentTypeSchema,
  MassIDLikeDocumentTypeSchema,
} from './document-enum.types';

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
  it('should accept MassID-family document types', () => {
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
