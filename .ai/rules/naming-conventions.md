---
id: naming-conventions
intent: Enforce consistent naming patterns for identifiers, files, and project structure
scope:
  - "*.ts"
  - "*.tsx"
requirements:
  - Use camelCase for variables, functions, parameters, and local constants
  - Use PascalCase for types, interfaces, enums, and classes
  - Use UPPER_SNAKE_CASE for module-level constants and enum members
  - Use kebab-case for file and directory names
  - Follow the processor file naming convention with `{rule-name}.processor.ts`, `{rule-name}.lambda.ts`, `{rule-name}.processor.spec.ts`, and `{rule-name}.lambda.e2e.spec.ts`
  - Use identifiers of three or more characters; single and two-letter names are prohibited except for well-known conventions in narrow scopes (e.g. `i` in a trivial for-loop index)
  - Prefix boolean variables and functions with `is`, `has`, `can`, `should`, or similar
anti_patterns:
  - Using PascalCase or UPPER_SNAKE_CASE for regular variables or function parameters
  - Naming files with camelCase or PascalCase (e.g. `ruleProcessor.ts` or `RuleProcessor.ts`)
  - Using generic names like `data`, `info`, `item`, `result`, `value` without a qualifying prefix that provides domain context
  - Naming interfaces with an `I` prefix (e.g. `IDocument`); use plain PascalCase instead
  - Suffixing types or interfaces with `Type` (e.g. `DocumentType` when `Document` suffices)
  - Mixing naming styles within the same scope (e.g. `total_weight` alongside `totalMass`)
  - Declaring types, schemas, or enums in a domain-scoped library without the domain prefix (e.g. `DocumentCategory` instead of `BoldDocumentCategory` in `bold/types/`)
  - Using `DocumentEvent` as a qualifier when the concept exists independently of document events (e.g. `DocumentEventVehicleType` instead of `BoldVehicleType`)
  - Placing generic types (e.g. `MeasurementUnit`) in a domain-scoped library instead of `libs/shared/types/`
---

# Naming Conventions Rule

## Rule body

Consistent naming reduces cognitive load and makes the codebase searchable. Every identifier and file in this repository must follow the patterns below.

### Identifier casing

| Kind | Casing | Example |
|---|---|---|
| Variable, function, parameter | camelCase | `vehicleWeight`, `computeScore` |
| Type, interface, enum, class | PascalCase | `RuleOutput`, `DocumentStatus` |
| Module-level constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PRECISION` |
| Enum member | UPPER_SNAKE_CASE | `DocumentStatus.APPROVED` |

### File naming

All files and directories use kebab-case:

```text
vehicle-validation.processor.ts
vehicle-validation.processor.spec.ts
vehicle-validation.lambda.ts
vehicle-validation.lambda.e2e.spec.ts
vehicle-validation.test-cases.ts
```

### Rule processor structure

Each rule processor follows a predictable naming pattern tied to the rule name:

| File | Pattern |
|---|---|
| Processor | `{rule-name}.processor.ts` |
| Lambda handler | `{rule-name}.lambda.ts` |
| Unit tests | `{rule-name}.processor.spec.ts` |
| E2E tests | `{rule-name}.lambda.e2e.spec.ts` |
| Test data | `{rule-name}.test-cases.ts` |

### Meaningful identifiers

Names must be descriptive enough to understand at the call site without jumping to the definition:

```ts
// Clear
const carbonCreditScore = computeCarbonCreditScore(massBalance);

// Unclear
const s = calc(mb);
```

Avoid generic names like `data`, `info`, or `result` unless qualified with domain context (e.g. `documentData`, `validationResult`).

### Domain-scoped type prefixes

Types, schemas, enums, and constants declared in a domain-scoped library must carry the domain prefix. The import path already provides namespace context, but the prefix makes the domain explicit at usage sites across the codebase.

| Library path | Prefix | Example |
|---|---|---|
| `libs/shared/methodologies/bold/*` | `Bold` | `BoldDocumentCategory`, `BoldVehicleType` |
| (MassID-specific within Bold) | `MassID` | `MassIDActorType`, `MassIDOrganicSubtype` |
| (RewardsDistribution-specific within Bold) | `RewardsDistribution` | `RewardsDistributionActorType` |
| (CreditOrder-specific within Bold) | `CreditOrder` | `CreditOrderStatus` |

Rules:

- **Drop `DocumentEvent`** when the concept exists independently of document events. Vehicle types, scale types, container types, and attribute names are domain concepts, not event-specific. Keep `DocumentEvent` only when the concept IS about events (e.g. `BoldDocumentEventName`, `BoldDocumentEventLabel`).
- **Drop `Document`** from actor type names. Actors belong to a domain, not to documents: `MassIDActorType`, not `MassIDDocumentActorType`.
- **`Methodology` is a qualifier, not a domain**. Use it as a qualifier within Bold: `BoldMethodologyActorType` (actors in Methodology-category documents), not `MethodologyDocumentActorType`.
- **Generic types belong in `libs/shared/types/`**, not in domain libraries. If a type is not specific to any methodology, move it up.

### Booleans

Boolean variables and functions should read as questions:

```ts
const isExpired = checkExpiration(document);
const hasValidSignature = verifySignature(certificate);
const canRetry = retryCount < MAX_RETRY_COUNT;
```
