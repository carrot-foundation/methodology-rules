---
id: finish-work
name: Finish Work
description: Run quality gates, commit changes, push branch, and create a pull request.
when_to_use:
  - When implementation is complete and ready to ship
  - When wrapping up a task and preparing for review
  - When asked to finalize and create a PR
workflow:
  - Run all quality checks (lint, type-check, tests)
  - Fix any failures found by quality checks
  - Stage and commit with a conventional commit message
  - Push the branch to the remote
  - Create a pull request with proper labels and reviewers
inputs:
  - Completed implementation on a feature branch
  - Context about what was changed for the commit message
outputs:
  - Passing quality checks
  - Git commit with conventional message
  - Pull request URL
references:
  - package.json
---

# Finish Work Skill

## Instructions

1. **Run quality gates**: Execute each check and fix any failures before proceeding.
   ```bash
   pnpm lint:affected
   pnpm ts:affected
   pnpm test:affected
   ```

2. **Fix failures**: If any check fails, fix the issue and re-run. Do not skip or ignore failures.

3. **Stage and commit**:
   - Run `git status` and `git diff` to review changes
   - Stage specific files by name (never use `git add .` or `git add -A`)
   - Write a conventional commit message: `<type>(<scope>): <description>`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`
   - Scopes: `nx`, `rule`, `shared`, `script`

4. **Push the branch**: Run `git push -u origin <branch-name>` to push and set the upstream.

5. **Create the pull request**:
   ```bash
   gh pr create \
     -a @me \
     -r @carrot-foundation/developers \
     --label <label> \
     -R carrot-foundation/methodology-rules \
     -t "<type>(<scope>): <title>"
   ```
   - Labels: `feature`, `bug`, `chore`, `docs`, `refactoring`
   - Include a summary of changes in the PR body

6. **Verify**: Confirm the PR was created successfully and share the PR URL.
