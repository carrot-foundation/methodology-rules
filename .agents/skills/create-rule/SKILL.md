---
name: create-rule
description: Use when adding or changing a BOLD rule processor, applying one to a methodology, or editing its findings or Lambda handler.
---

# Develop BOLD rule processors

Use a current sibling such as the `weighing` library and its BOLD Carbon application as a model.
The commands `pnpm create-rule <name> <scope> <description>` and
`pnpm apply-methodology-rule <methodology> <rule> <scope>` use the legacy `<scope>/src/<name>`
layout. The current library projects use `<scope>/<name>/src`. Build the library and applications
on the current layout, and use the CLI templates only as examples.

## Layout

```text
libs/methodologies/bold/rule-processors/<scope>/<name>/
  project.json                    Nx library and its targets
  package.json                    Workspace package metadata
  vitest.config.ts                Unit tests
  vitest.e2e.config.ts            Lambda tests, when the project has test-e2e
  src/
    index.ts                     Public exports
    <name>.lambda.ts              Thin wrapper around the processor
    <name>.processor.ts           Document loading and evaluation
    <name>.rule-definition.ts     Rule metadata, events and version
    <name>.rule-subject.ts        Rule-subject schema, as needed
    <name>.findings.ts            Published finding codes and categories
    <name>.constants.ts           Thresholds and message templates, as needed
    <name>.helpers.ts             Stateless functions, as needed
    <name>.processor.spec.ts      Evaluation tests
    <name>.lambda.e2e.spec.ts      Lambda entry-point tests
    <name>.test-cases.ts           Fixtures shared by processor and Lambda tests

apps/methodologies/bold-<methodology>/rule-processors/<scope>/<application>/
  project.json                    Build, package and upload targets
  src/
    lambda.ts                     Exports the library Lambda as handler
    rule-definition.ts            Methodology application metadata
```

The application slug can differ from the library slug. Use `mass-id` for MassID processors and
verify registration in the intended methodology's `rules.config.ts`. Read the [rule registry
skill](../methodology-registry/SKILL.md) when wiring or updating a registry entry.

## Evaluation and findings

- Keep the Lambda entry point thin. Construct the processor once and wrap it with
  `wrapRuleIntoLambdaHandler` from `@carrot-fndn/shared/lambda/wrapper`. Select the shared processor
  base that matches the rule's subject. Some processors use `ParentDocumentRuleProcessor`, while
  custom document-loading flows can use `RuleDataProcessor`.
- Put evaluation in the processor and validate its subject before evaluation. Put stateless
  helpers in the helper module, and keep thresholds and result message templates in the constants
  module when shared across methods.
- Render every non-passing result through the finding declarations so `resultContent.findings`
  reaches Smaug. Use `<RULE>_FINDINGS.result(...)` for a single message, `joinRenderedFindings` for
  several, and `getKnownError(<RULE>_FINDINGS.render(...))` for a known thrown failure. Findings on
  `PASSED` carry category `OBSERVATION`. Published finding codes have the form
  `<slug>.<GROUP>.<KEY>` and are consumer identifiers.
- Set `dependsOnAccreditation` only if a synthetic accreditation in Smaug's TEST dataset can
  cause the check to fail because it fabricates or omits the evaluated value. Examples include
  recycler GHG type, baseline, sorting factor, scale type, accredited address, the Container
  Quantity waiver or the accreditation document itself. Checks against a value copied from the
  MassID keep the flag unset. The flag suppresses evaluation of the finding on every TEST run.
- Exercise both the processor and Lambda entry point. Share synthetic cases via the test-cases
  module and reuse workspace stubs, including `stubRuleInput`, `createStubFromSchema` and
  `BoldStubsBuilder`. Use `aws-sdk-client-mock` for AWS SDK clients.
