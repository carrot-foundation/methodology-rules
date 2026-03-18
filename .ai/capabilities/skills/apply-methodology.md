---
id: apply-methodology
name: Apply Methodology Rule
description: Apply an existing rule processor to a specific methodology using the apply script.
when_to_use:
  - When applying an existing rule to a methodology
  - When connecting a rule processor to a methodology like carbon-organic or bold-recycling
  - When asked to wire up or link a rule to a methodology
workflow:
  - Identify the target methodology and rule
  - Run the apply-methodology-rule script
  - Verify with quality checks
inputs:
  - Methodology name (e.g., carbon-organic, bold-recycling)
  - Rule name (e.g., geolocation-precision)
  - Scope (mass-id, credit-order, or mass-id-certificate)
outputs:
  - Rule applied to the methodology with all wiring in place
references:
  - tools/apply-methodology-rule.js
---

# Apply Methodology Rule Skill

## Instructions

1. **Identify the parameters**:
   - `<methodology>`: the target methodology (e.g., `carbon-organic`, `bold-recycling`)
   - `<rule>`: the rule processor name (e.g., `geolocation-precision`)
   - `<scope>`: the processor group (`mass-id`, `credit-order`, or `mass-id-certificate`)

2. **Run the apply script**:

   ```bash
   pnpm apply-methodology-rule <methodology> <rule> <scope>
   ```

   Example:

   ```bash
   pnpm apply-methodology-rule carbon-organic geolocation-precision mass-id
   ```

3. **Verify** the application was successful by running quality checks:

   ```bash
   pnpm lint:affected
   pnpm ts:affected
   pnpm test:affected
   ```

   All three checks must pass.
