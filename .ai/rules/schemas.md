---
id: schemas
intent: Enforce Zod schema conventions for runtime validation and type derivation
scope:
  - "*.ts"
requirements:
  - Define Zod schemas as the single source of truth for shapes requiring runtime validation
  - Colocate each schema with the type it validates in the same file or adjacent `types.ts`
  - Derive static TypeScript types from schemas using `z.infer<typeof Schema>`
  - Use `.safeParse()` for external or untrusted input to handle errors gracefully
  - Use `.parse()` only for internal data where failure indicates a programming bug
  - Generate test data from schemas using zocker and `createStubFromSchema()` from `@carrot-fndn/shared/testing`
  - Compose schemas using `z.object()`, `.extend()`, `.merge()`, and `.pick()` to avoid duplication
anti_patterns:
  - Maintaining a hand-written interface alongside a Zod schema for the same shape
  - Using `.parse()` on user-supplied or network input without error handling
  - Scattering schema definitions across multiple files when they describe a single domain object
  - Writing manual test fixture factories when a schema-driven stub generator exists
  - Using `z.any()` or `z.unknown()` as a permanent placeholder instead of defining concrete fields
---

# Zod Schemas Rule

## Rule body

Zod is the runtime validation library for this project. Schemas serve a dual purpose: they validate data at runtime boundaries and provide the canonical type definition via `z.infer`.

### Schema definition

Define schemas close to the types they describe. A common pattern is to export both from the same file:

```ts
import { z } from 'zod';

export const VehicleSchema = z.object({
  plate: z.string().min(7),
  weightKg: z.number().positive(),
  type: z.enum(['truck', 'van', 'car']),
});

export type Vehicle = z.infer<typeof VehicleSchema>;
```

Never create a separate `interface Vehicle` that duplicates the schema shape.

### Validation strategy

Choose the right parse method based on the trust level of the data:

```ts
// External input (API payload, S3 object, SQS message) - handle errors
const result = VehicleSchema.safeParse(rawPayload);
if (!result.success) {
  logger.warn('Invalid vehicle payload', result.error.flatten());
  return { error: 'INVALID_INPUT' };
}
const vehicle = result.data;

// Internal data (already validated upstream) - let it throw
const vehicle = VehicleSchema.parse(trustedData);
```

### Schema composition

Reuse schemas through composition rather than copy-pasting fields:

```ts
const BaseDocumentSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
});

const CertificateSchema = BaseDocumentSchema.extend({
  issuer: z.string(),
  validUntil: z.string().datetime(),
});
```

### Test data generation

Use zocker and the shared testing utilities to generate test data from schemas:

```ts
import { createStubFromSchema } from '@carrot-fndn/shared/testing';

const stubVehicle = createStubFromSchema(VehicleSchema);
```

This ensures test data always conforms to the current schema shape and evolves automatically when the schema changes.

### Schema layering

Document schemas are organized in five layers with progressive strictness:

| Layer | Naming convention | Zod strategy | Purpose |
|-------|------------------|--------------|---------|
| Envelope | `LoadedDocumentEnvelopeSchema` | `z.object` | Wrapper for loaded documents |
| Inbound | `Inbound*Schema` | `z.object` (strips unknown fields) | Boundary contract for external data |
| Normalized | `*Schema` | `z.object` (strips unknown fields) | Strict internal representation |
| Domain | `Bold*Schema`, `MassID*Schema` | `z.object` with methodology-specific fields | Methodology-specific extensions |
| Rule | `*RuleSubjectSchema` | `z.object` with exact fields needed | Exact contract per rule processor |

Key conventions:

- **All layers use `z.object`**: Every layer strips unknown fields on parse. Do not use `z.looseObject` in layer schemas — each layer should be more specific, not more permissive.
- **`z.looseObject` for predicate/getter validators only**: Narrow structural checks in predicate or getter helpers (e.g. "does this event have a `metadata.attributes` array?") may use `z.looseObject` to avoid rejecting objects that carry extra fields they don't inspect. These are not layer schemas.
- **Rule subject schemas are mandatory**: Every rule processor must define a `*RuleSubjectSchema` that describes the exact data it needs.
- **`validateRuleSubjectOrThrow`**: Standard entry point for rule subject validation. Use this instead of calling `.parse()` directly.
- **Const-object + `z.enum()` for value sets**: Define allowed values as a const object, then derive a `z.enum()` from its values. Use `.extract()` to narrow to a subset and `.literal()` for single-value constraints in deeper layers.

```ts
const MATERIAL_TYPE = {
  Organic: 'organic',
  Recyclable: 'recyclable',
  Hazardous: 'hazardous',
} as const;

const MaterialTypeSchema = z.enum(
  Object.values(MATERIAL_TYPE) as [string, ...string[]],
);

// Narrower layer
const OrganicOnlySchema = MaterialTypeSchema.extract(['organic']);
```
