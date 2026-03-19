---
id: pull-request
intent: Standardize pull request creation and review workflow using gh CLI
scope:
  - "*"
requirements:
  - Create PRs using gh CLI with required flags: `-a @me -r @carrot-foundation/developers -R carrot-foundation/methodology-rules`
  - Apply the correct label matching the change type: feature, bug, chore, docs, refactoring
  - Use the PR title format matching conventional commits `<type>(<scope>): <description>`
  - Write a concise summary (1-3 sentences) starting with an action verb
  - Fill in the repo PR template from `.github/pull_request_template.md`
  - Run `pnpm lint:affected`, `pnpm ts:affected`, and `pnpm test:affected` before opening the PR
anti_patterns:
  - Creating PRs through the GitHub web UI instead of gh CLI (misses required flags)
  - Using generic labels like "enhancement" instead of the project-specific label set
  - Writing multi-paragraph summaries when a few sentences suffice
  - Opening a PR without verifying that affected tests, lint, and type checks pass
  - Assigning reviewers manually instead of using the team alias
---

# Pull Request Rule

## Rule body

Pull requests are created exclusively through the `gh` CLI to ensure consistent metadata.

### Creating a PR

```bash
gh pr create \
  -a @me \
  -r @carrot-foundation/developers \
  --label feature \
  -R carrot-foundation/methodology-rules \
  -t "feat(rule): add vehicle weight validation"
```

Adjust `--label` to match the change type:

| Label         | When to use                       |
|---------------|-----------------------------------|
| `feature`     | New functionality                 |
| `bug`         | Bug fix                           |
| `chore`       | Tooling, CI, dependencies         |
| `docs`        | Documentation changes             |
| `refactoring` | Code restructuring                |

### PR summary

The summary should be brief and action-oriented:

- Start with a verb: "Add", "Fix", "Refactor", "Remove"
- 1-3 sentences covering the what and why
- Link related issues if applicable

### Pre-submission checklist

Before opening the PR, verify locally:

```bash
pnpm lint:affected
pnpm ts:affected
pnpm test:affected
```

These same checks run in CI, but catching failures early saves review cycles.
