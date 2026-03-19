---
id: commit
intent: Enforce Conventional Commits format for consistent and parseable commit history
scope:
  - "*"
requirements:
  - Follow Conventional Commits format `<type>(<scope>): <description>`
  - Use allowed types: feat, fix, docs, style, refactor, perf, test, chore, revert
  - Use allowed scopes: nx, rule, shared, script
  - Write the subject in imperative mood with a lowercase first letter
  - Keep the header line (type + scope + description) to 100 characters or fewer
  - Use `pnpm commit` for the interactive conventional commit prompt when available
  - Include a body for non-trivial changes explaining the motivation behind the change
anti_patterns:
  - Ending the subject line with a period
  - Using past tense in the subject (e.g. "added feature" instead of "add feature")
  - Combining unrelated changes in a single commit
  - Using a type that does not match the change (e.g. `feat` for a bug fix)
  - Writing vague subjects like "fix stuff", "update code", or "wip"
  - Omitting the scope when the change clearly belongs to one area
---

# Commit Conventions Rule

## Rule body

All commits in this repository follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This enables automated changelog generation and makes the history easy to scan.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | When to use                                    |
|------------|------------------------------------------------|
| `feat`     | A new feature or capability                    |
| `fix`      | A bug fix                                      |
| `docs`     | Documentation-only changes                     |
| `style`    | Formatting, whitespace, semicolons (no logic)  |
| `refactor` | Code restructuring without behavior change     |
| `perf`     | Performance improvement                        |
| `test`     | Adding or updating tests                       |
| `chore`    | Build scripts, CI config, tooling              |
| `revert`   | Reverting a previous commit                    |

### Scopes

- **nx** - Nx workspace configuration, project.json, generators
- **rule** - Rule processor logic and related files
- **shared** - Shared libraries under `libs/shared/`
- **script** - Tooling scripts under `tools/`

### Examples

```
feat(rule): add vehicle definition validation
fix(shared): prevent racing of requests
refactor(nx): consolidate build targets
test(rule): add edge cases for weight threshold
chore(script): update create-rule template
```

### Interactive commit

Run `pnpm commit` to use the interactive prompt which enforces the format automatically.
