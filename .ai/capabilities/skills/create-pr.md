---
id: create-pr
name: Create Pull Request
description: Analyze changes and create a pull request using the gh CLI with repo conventions.
when_to_use:
  - When the user wants to create a pull request
  - When work on a branch is complete and ready for review
  - When asked to open or submit a PR
workflow:
  - Analyze all commits and changes on the branch
  - Draft a PR title and description
  - Push the branch to the remote if needed
  - Create the PR with gh CLI using repo-specific flags
inputs:
  - Branch with committed changes
  - Label for the PR (feature, bug, chore, docs, refactoring)
outputs:
  - A pull request URL
references:
  - package.json
---

# Create Pull Request Skill

## Instructions

1. **Analyze changes**: Review all commits on the branch since it diverged from main:

   ```bash
   git log main..HEAD --oneline
   git diff main...HEAD
   ```

2. **Push the branch** if it has not been pushed yet:

   ```bash
   git push -u origin HEAD
   ```

3. **Create the PR** using the `gh` CLI with the required repo flags:

   ```bash
   gh pr create \
     -a @me \
     -r @carrot-foundation/developers \
     --label <label> \
     -R carrot-foundation/methodology-rules \
     -t "<type>(<scope>): <description>"
   ```

   - **Labels**: `feature`, `bug`, `chore`, `docs`, `refactoring`
   - **Title**: Use conventional commit format matching the branch type
   - **Body**: Include a summary section, details of what changed, and a declaration checkbox

4. **Return the PR URL** to the user once created.
