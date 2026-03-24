import { MethodologyActorTypeSchema } from '@carrot-fndn/shared/types';

import {
  DocumentEventNameSchema,
  DocumentSubtypeSchema,
  MassIDDocumentActorTypeSchema,
  MassIDOrganicSubtypeSchema,
} from './enum.types';

describe('DocumentEventNameSchema', () => {
  it('should include all MethodologyDocumentEventName members except Recycling Baseline', () => {
    expect(DocumentEventNameSchema.safeParse('Drop-off').success).toBe(true);
    expect(DocumentEventNameSchema.safeParse('Pick-up').success).toBe(true);
    expect(DocumentEventNameSchema.safeParse('ACTOR').success).toBe(true);
    expect(DocumentEventNameSchema.safeParse('Recycled').success).toBe(true);
  });

  it('should include the additional END and MOVE members', () => {
    expect(DocumentEventNameSchema.safeParse('END').success).toBe(true);
    expect(DocumentEventNameSchema.safeParse('MOVE').success).toBe(true);
  });

  it('should exclude Recycling Baseline', () => {
    expect(
      DocumentEventNameSchema.safeParse('Recycling Baseline').success,
    ).toBe(false);
  });

  it('should reject invalid values', () => {
    expect(DocumentEventNameSchema.safeParse('INVALID').success).toBe(false);
  });
});

describe('MassIDDocumentActorTypeSchema', () => {
  it.each(['Hauler', 'Integrator', 'Processor', 'Recycler', 'Waste Generator'])(
    'should accept valid actor type: %s',
    (value) => {
      expect(MassIDDocumentActorTypeSchema.safeParse(value).success).toBe(true);
    },
  );

  it('should be a strict subset of MethodologyActorTypeSchema', () => {
    for (const value of MassIDDocumentActorTypeSchema.options) {
      expect(MethodologyActorTypeSchema.safeParse(value).success).toBe(true);
    }
  });

  it('should reject actor types not in the subset', () => {
    expect(MassIDDocumentActorTypeSchema.safeParse('Auditor').success).toBe(
      false,
    );
    expect(MassIDDocumentActorTypeSchema.safeParse('Network').success).toBe(
      false,
    );
  });
});

describe('DocumentSubtypeSchema', () => {
  it('should include all MassIDOrganicSubtype members', () => {
    for (const value of MassIDOrganicSubtypeSchema.options) {
      expect(DocumentSubtypeSchema.safeParse(value).success).toBe(true);
    }
  });

  it('should include all MassIDDocumentActorType members', () => {
    for (const value of MassIDDocumentActorTypeSchema.options) {
      expect(DocumentSubtypeSchema.safeParse(value).success).toBe(true);
    }
  });

  it('should include additional non-actor, non-organic subtypes', () => {
    expect(DocumentSubtypeSchema.safeParse('Group').success).toBe(true);
    expect(DocumentSubtypeSchema.safeParse('Process').success).toBe(true);
    expect(DocumentSubtypeSchema.safeParse('Source').success).toBe(true);
    expect(DocumentSubtypeSchema.safeParse('TCC').success).toBe(true);
    expect(DocumentSubtypeSchema.safeParse('TRC').success).toBe(true);
  });

  it('should reject invalid values', () => {
    expect(DocumentSubtypeSchema.safeParse('INVALID').success).toBe(false);
  });
});
