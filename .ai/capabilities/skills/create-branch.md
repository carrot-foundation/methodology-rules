---
id: create-branch
name: Create Branch
description: Create a new git branch from latest main using the naming convention.
when_to_use:
  - When starting new work or a new task
  - When creating a feature branch
  - When the user asks to begin a new feature, fix, or chore
workflow:
  - Fetch and pull the latest main branch
  - Create a new branch with the correct naming pattern
  - Switch to the new branch
inputs:
  - Type of work (feat, fix, chore, refactor, etc.)
  - Short description of the work
outputs:
  - A new branch checked out and ready for development
references:
  - package.json
---

# Create Branch Skill

## Instructions

1. **Pull latest main**:

   ```bash
   git fetch origin main
   git checkout main
   git pull origin main
   ```

2. **Create the branch** using the naming pattern `<type>/<short-description>`:

   ```bash
   git checkout -b <type>/<short-description>
   ```

   - Use kebab-case for the description
   - Types match conventional commit types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`
   - Examples:
     - `feat/add-vehicle-validation`
     - `fix/geolocation-precision-edge-case`
     - `chore/update-dependencies`
     - `refactor/extract-shared-helpers`

3. **Verify** you are on the new branch with `git branch --show-current`.
