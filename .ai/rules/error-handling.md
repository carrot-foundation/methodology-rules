---
id: error-handling
intent: Ensure errors are validated, propagated, and logged correctly across Lambda handlers and shared libraries
scope:
  - "*.ts"
requirements:
  - Validate inputs at system boundaries (Lambda entry points, API responses, external data) using Zod schemas with `.safeParse()` or `.parse()`
  - Enrich caught errors with contextual information (function name, input identifiers, operation being performed) before re-throwing or logging
  - In Lambda handlers, let unrecoverable errors propagate to the Lambda runtime so that AWS retry and DLQ mechanisms work correctly
  - Log errors with structured context using pino; include correlation IDs, document IDs, and operation names in log entries
  - Use Result-like patterns or typed error classes for expected failure modes that callers must handle
  - Wrap third-party library calls in try/catch at the integration boundary to translate vendor errors into domain errors
anti_patterns:
  - Catching an error and silently discarding it with an empty catch block or a bare `console.log`
  - Logging sensitive data (credentials, tokens, full document bodies containing PII) in error messages
  - Using `try/catch` around every function call instead of letting errors propagate naturally to the appropriate handler
  - Returning `null` or `undefined` to signal an error condition when a thrown error or Result type would be more explicit
  - Catching generic `Error` at a low level and converting it to a boolean success/failure, losing the original stack trace and message
  - Using `console.log` or `console.error` instead of the project's structured logger (pino)
---

# Error Handling Rule

## Rule body

Proper error handling ensures that failures are visible, diagnosable, and recoverable. In a Lambda-based architecture, error propagation also controls retry behavior and dead-letter queue routing.

### Input validation at boundaries

Validate external data where it enters the system. Use Zod schemas:

```ts
const parseResult = RuleInputSchema.safeParse(event);

if (!parseResult.success) {
  logger.error({ errors: parseResult.error.issues }, 'Invalid rule input');
  throw new ValidationError('Rule input failed schema validation', {
    cause: parseResult.error,
  });
}

const ruleInput = parseResult.data;
```

Internal function-to-function calls within a trusted boundary do not need redundant validation; rely on TypeScript's type system there.

### Error enrichment

When catching an error to add context, preserve the original error as the `cause`:

```ts
try {
  await fetchDocument(documentId);
} catch (error) {
  throw new DocumentFetchError(
    `Failed to fetch document ${documentId} during credit evaluation`,
    { cause: error },
  );
}
```

This preserves the full error chain for debugging while adding the business context needed to understand what was happening.

### Lambda error propagation

Lambda handlers must not swallow errors for operations that should be retried. Let the error propagate to the Lambda runtime:

```ts
// Correct - error reaches Lambda runtime, triggers retry
export const handler = async (event: SQSEvent): Promise<void> => {
  const input = parseAndValidate(event);
  await processRule(input);
};

// Wrong - error is caught and swallowed, message is lost
export const handler = async (event: SQSEvent): Promise<void> => {
  try {
    const input = parseAndValidate(event);
    await processRule(input);
  } catch {
    console.log('Something went wrong');
  }
};
```

### Structured logging

Use pino for all logging. Include structured fields that aid debugging:

```ts
logger.error(
  {
    documentId,
    ruleId,
    operation: 'evaluateResult',
    err: error,
  },
  'Rule evaluation failed',
);
```

Never include credentials, tokens, full request/response bodies with PII, or other sensitive data in log output.

### Result patterns for expected failures

For failure modes that callers are expected to handle (e.g., a document that legitimately fails validation), consider using a Result-like return type instead of throwing:

```ts
type EvaluationResult =
  | { success: true; output: RuleOutput }
  | { success: false; reason: string };
```

Reserve thrown errors for unexpected failures (infrastructure errors, programming bugs, corrupted data).
