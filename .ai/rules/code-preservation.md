---
id: code-preservation
intent: Protect existing code, tests, and features from unintended removal or modification
scope:
  - "*"
requirements:
  - Obtain explicit user approval before deleting any existing code, test, or feature
  - When refactoring, verify that all existing behavior is preserved by running the relevant test suite before and after changes
  - Scope changes tightly to the task at hand; do not modify unrelated code even if it looks improvable
  - Preserve existing error handling, logging, and edge-case guards unless the change specifically targets them
  - When moving code to a new location, ensure the old call sites are updated and no functionality is silently dropped
anti_patterns:
  - Removing test cases or test files as part of a refactor without confirming they are truly obsolete
  - Deleting error handling or validation logic because it seems redundant without tracing all call paths
  - "Cleaning up" code outside the scope of the current task, which risks introducing regressions
  - Replacing a detailed implementation with a simplified version that silently drops edge cases
  - Removing feature flags, fallback logic, or backwards-compatibility shims without stakeholder confirmation
  - Collapsing multiple specific error messages into a single generic one during a refactor
---

# Code Preservation Rule

## Rule body

This rule exists to prevent accidental loss of functionality during development. Code that is already working, tested, and deployed represents invested effort and validated behavior.

### Do not delete without approval

Before removing any code, test, or feature, ask the user for explicit confirmation. This includes:

- Removing a function, class, or module that appears unused.
- Deleting a test case that seems redundant.
- Dropping an entire file during a restructuring.

Even if you are confident the code is dead, confirm first. There may be runtime references, dynamic imports, or downstream consumers you are not aware of.

### Refactoring discipline

When refactoring:

1. **Run tests before starting** to establish a green baseline.
2. **Make changes incrementally** so that if a test breaks, the cause is easy to identify.
3. **Run tests after each change** to confirm behavior is preserved.
4. **Do not change signatures** of exported functions unless that is the explicit goal of the task.

### Stay in scope

If you notice unrelated code that could be improved while working on a task, note it but do not modify it. Unrelated changes:

- Make pull requests harder to review.
- Increase the risk of regressions.
- Obscure the intent of the change.

### Error handling is sacred

Existing error handling, catch blocks, validation checks, and fallback logic should not be removed or simplified during unrelated work. These guards often exist because of production incidents or edge cases that are not obvious from reading the code alone.

### Moving code

When relocating code (e.g., extracting to a shared library), ensure:

- All original call sites are updated to use the new location.
- No functionality is silently dropped during the move.
- Tests are updated to reference the new module paths.
- The old location is cleaned up only after confirming all references are resolved.
