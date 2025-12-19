# Create Branch

Generate Git branch name following Conventional Commit conventions.

## Usage

```
/create-branch [type] [description-words...]
```

**Examples:**

```
/create-branch feat add real-time dashboard
/create-branch fix smart-contracts overflow issue
```

**Interactive:** Call without arguments for guided workflow

## Workflow

### 1. Gather Context

- Primary purpose (feat, fix, refactor, etc.)
- Scope from `.cursor/rules/commit-rules.mdc` or `.vscode/settings.json` (nx, rule, shared, script)
- Ticket ID if applicable
- Summary in 3-6 kebab-case keywords

### 2. Choose Format

- Preferred: `<type>/<short-description>`
- With scope: `<type>/<scope>-<short-description>`
- With ticket: append `-<TICKET>`

### 3. Validate

- Length ≤60 characters
- Lowercase, kebab-case only
- No prohibited punctuation
- Specific and meaningful description

### 4. Present Result

- Suggested branch name
- Rationale (type, scope, description)
- Reminder: align with commits and PR

## Challenge Points

- Filler words ("update", "changes")? → Demand specifics
- Length >60 chars? → Suggest trimming
- Multiple concerns? → Separate branches
- Unclear scope? → Ask which component affected

## Related

- `.ai/categories/workflow/branch-naming.md` - Complete naming standards
- `.cursor/rules/commit-rules.mdc` - Type and scope alignment
