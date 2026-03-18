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
