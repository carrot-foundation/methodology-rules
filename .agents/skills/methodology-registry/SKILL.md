---
name: methodology-registry
description: Use when editing rules.config.ts, methodology application metadata, generated rule READMEs, Codecov rule flags or rule manifests.
---

# Update the rule registry

The authored methodology registries are `libs/methodologies/bold-carbon/rules/src/rules.config.ts`
and `libs/methodologies/bold-recycling/rules/src/rules.config.ts`. Application metadata lives in
`src/rule-definition.ts` in the corresponding deployable application. The processor's public
finding declarations feed the finding catalog.

After changing a registry, run the same generators as the release workflow:

```sh
pnpm generate:readmes
pnpm generate:methodology-readmes
pnpm generate:manifest
```

`generate:readmes` writes the deployed applications' per-rule READMEs and `codecov.yml`.
`generate:methodology-readmes` writes the READMEs under the methodology registry packages.
`generate:manifest` emits the unified manifest and finding catalog under `dist/`. Use it as
the replacement for the legacy standalone framework manifest generator. Review generated diffs
and commit the tracked outputs with their inputs. Treat generated READMEs, Codecov flags and
`dist/` files as generator outputs. The legacy BOLD READMEs under `apps/methodologies/bold/`
are maintained separately.
