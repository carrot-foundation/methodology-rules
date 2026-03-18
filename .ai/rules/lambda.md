---
id: lambda
intent: Enforce thin Lambda handler patterns that delegate to processors
scope:
  - "**/*.lambda.ts"
requirements:
  - Keep Lambda handlers thin by delegating all business logic to the processor class
  - Use shared Lambda utilities from `@carrot-fndn/shared/lambda` for handler boilerplate
  - Let unrecoverable errors propagate to the Lambda runtime so AWS retry mechanisms can handle them
  - Write E2E tests in `{rule-name}.lambda.e2e.spec.ts` that exercise the full handler path
  - Export the handler function as a named export consistent with the project convention
anti_patterns:
  - Implementing business logic or validation directly in the Lambda handler file
  - Catching and swallowing errors that should propagate for Lambda retry handling
  - Adding environment variable parsing or configuration logic in the handler instead of using shared utilities
  - Creating helper functions in the Lambda file that belong in the processor or shared library
  - Testing Lambda handlers with only unit tests and skipping the e2e spec
---

# Lambda Handler Rule

## Rule body

Lambda handlers are the entry points for AWS Lambda invocations. They must remain thin wrappers that connect the Lambda runtime to the processor.

### Handler structure

A typical Lambda handler file:

```ts
import { wrapHandler } from '@carrot-fndn/shared/lambda';
import { VehicleValidationProcessor } from './vehicle-validation.processor';

const processor = new VehicleValidationProcessor();

export const handler = wrapHandler(processor);
```

The handler should contain no business logic. All evaluation, validation, and transformation happens in the processor.

### Error handling

Let errors propagate naturally to the Lambda runtime:

```ts
// Correct - errors propagate for retry
export const handler = wrapHandler(processor);

// Wrong - swallowing errors prevents retries
export const handler = async (event: unknown) => {
  try {
    return await processor.execute(event);
  } catch {
    return { statusCode: 500, body: 'Error' };
  }
};
```

AWS Lambda has built-in retry mechanisms for asynchronous invocations. Swallowing errors defeats this reliability mechanism.

### E2E testing

E2E tests exercise the full handler path including event deserialization:

```ts
import { handler } from './vehicle-validation.lambda';
import { validInput, invalidInput } from './vehicle-validation.test-cases';

describe('VehicleValidation Lambda E2E', () => {
  it('should return approved for valid input', async () => {
    const result = await handler(validInput);
    expect(result.resultStatus).toBe('APPROVED');
  });
});
```

These tests complement the processor unit tests by verifying the integration between the handler and processor layers.
