# Create Pull Request

Create PR following project conventions with critical analysis.

## Usage

```
/create-pr [base-branch]
```

**Default:** Base branch is `main`

## Workflow

### 1. Gather Context

- [ ] Review current branch and commit history
- [ ] Check diff stats and affected files
- [ ] Confirm base branch (default: `main`)

### 2. Critical Analysis

Output analysis per `@pull-request-rules.mdc`:

**Size assessment:**

- Lines/files changed vs limits
- Reasonable or needs split?

**Clarity assessment:**

- Commit message quality
- Business value clarity
- Testing requirements

**Red flags:**

- Scope: >400 lines or >20 files? → Suggest splits
- Clarity: Vague commits/value? → Demand clarification
- Quality: No tests? Breaking changes? → Question approach

**Do not proceed until clear or questions answered**

### 3. Create Description

Follow the template structure from `.cursor/rules/pull-request-rules.mdc`:

- [ ] Craft clear title (NOT conventional commit format)
- [ ] Fill required sections (Summary, Details, Related links, Declaration checkbox)
- [ ] Challenge weak value propositions
- [ ] Remove empty sections and noise

### 4. Save and Output

- Sanitize branch name (replace `/` with `-`)
- Save to `tmp/pull-requests/{sanitized-branch}.md`
- Output exact `gh pr create` command:

```bash
gh pr create \
  -r carrot-foundation/developers \
  -R carrot-foundation/methodology-rules \
  -t "PR Title Here" \
  -B <base-branch> \
  -F tmp/pull-requests/{sanitized-branch}.md

# Or as draft:
gh pr create -d [same flags...]
```

**User executes manually after reviewing file**

## Challenge Points

- Size exceeds limits? → Provide split breakdown
- Unrelated commits? → Separate PRs per concern
- No test changes? → Question coverage
- Weak value? → Demand metrics/outcomes
- Breaking changes? → Request migration path
- Vague commits? → Clarify before PR

## Related

- `.cursor/rules/pull-request-rules.mdc` - PR description guidelines and template structure
- `.ai/categories/workflow/pull-request.md` - Core PR rules and analysis
