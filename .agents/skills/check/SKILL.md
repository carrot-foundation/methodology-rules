---
name: check
description: Use when validating affected Methodology Rules projects or checking a tooling-only change before a pull request.
---

# Check Methodology Rules

Use the proposed PR base, normally `origin/main`, as the Nx base. For a refactor on a
committed branch, pass `--base=origin/main --head=HEAD` to the affected commands.

```sh
pnpm lint:affected --base=origin/main --head=HEAD
pnpm ts:affected --base=origin/main --head=HEAD
pnpm test:affected --base=origin/main --head=HEAD
```

During editing, omit `--head` to include worktree changes. For a known project missing from the
affected selection, use `pnpm lint <project>`, `pnpm ts <project>` and `pnpm test <project>`.

For changes confined to repository documentation, agent configuration, scripts outside Nx
projects, or workflow wiring, check the existing validators for the touched inputs. Run
Prettier in check mode on changed supported files. Run `pnpm pkgJsonLint` for package manifest
edits and `pnpm test:pnpm-lockfile` for root manifest or lockfile changes. Check affected shell
scripts with `sh -n` when they use POSIX shell and validate the agent configuration with the same
repository audit that CI runs. Changes to Nx project inputs still need the affected gate.
