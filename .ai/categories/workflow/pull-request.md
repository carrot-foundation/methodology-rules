---
title: "Pull Request Guidelines"
description: "Workflow and standards for creating well-structured pull requests"
category: "workflow"
priority: "required"
appliesTo: ["all"]
tools: ["cursor", "claude", "copilot", "all"]
version: '1.1.1'
lastUpdated: '2025-12-05'
relatedRules: ["commit.md", "branch-naming.md"]
---

# Pull Request Guidelines

Guide developers and AI agents in creating well-structured pull requests that follow project conventions and facilitate efficient code review.

When prompted to create a PR, follow this workflow:

1. **Gather required information** using these commands:

   - `git log --oneline <base-branch>..HEAD`
   - `git diff --stat <base-branch>..HEAD`
   - `git diff <base-branch>..HEAD --name-only`
   - `pnpm nx show projects --affected` (if available)

2. **Assess context sufficiency**: If commits are unclear, file changes are cryptic, or business purpose is ambiguous, **ask the user for clarification** before proceeding.

3. **Request additional context** when needed:

   - "The commit messages don't clearly explain the business purpose. Can you provide more context about why this change was needed?"
   - "What user problem does this solve?"
   - "Are there any breaking changes or special testing requirements?"
   - "Should this PR be linked to any issues or documentation?"

4. **Create the PR description** following the template requirements
5. **Output the gh command** as a markdown code block for manual execution
6. **Open the description file** for review

## PR Title Format

PR titles should be **clear, descriptive, and user-focused** rather than following Conventional Commit format:

- **Start with capital letter** - First word capitalized, rest in sentence case
- **Be concise** - Aim for 50-60 characters maximum
- **Focus on the outcome** - What the PR accomplishes, not how it's implemented
- **Use plain English** - Avoid technical jargon when simpler words convey the same meaning
- **Match PR content** - Title should align with the summary and scope sections

### Title Examples

❌ **Avoid**: Conventional commit format in titles

```text
feat(smart-contracts): implement certificate minting system
fix(web): resolve dashboard rendering on mobile devices
refactor(shared): consolidate validation utilities
```

✅ **Good**: Clear, descriptive titles

```text
Implement certificate minting system for recycling verification
Fix dashboard rendering issues on mobile devices
Consolidate validation utilities for better maintainability
```

### Title Guidelines by Change Type

**New Features:**

- "Add [feature] for [benefit]"
- "Implement [functionality] to enable [capability]"
- "Introduce [component] for improved [aspect]"

**Bug Fixes:**

- "Fix [issue] in [component]"
- "Resolve [problem] when [condition]"
- "Correct [behavior] for [scenario]"

**Improvements:**

- "Improve [aspect] by [method]"
- "Optimize [component] for better [outcome]"
- "Enhance [feature] with [addition]"

**Configuration/Maintenance:**

- "Update [component] configuration"
- "Upgrade [dependency] to version [X]"
- "Refactor [module] for better maintainability"

## PR description

- **Always use the existing template at `.github/pull_request_template.md`** (when available)
- Complete only applicable sections; remove the rest
- **Template usage is mandatory - never create PR descriptions without following the template structure**

### Information Gathering Requirements

**Mandatory inputs:**

- Current branch name
- Target/base branch (defaults to `main`)
- Commit history: `git log --oneline <base-branch>..HEAD`
- File changes: `git diff --stat <base-branch>..HEAD` and `git diff <base-branch>..HEAD --name-only`

**Optional inputs:**

- Affected projects: `pnpm nx show projects --affected`
- Additional context from user when commits/changes are unclear

### Quality Assessment Criteria

Before creating the PR description, verify:

1. **Commit clarity**: Do commit messages clearly explain the business purpose?
2. **Change scope**: Are the file changes coherent and focused?
3. **Business context**: Is it clear what user/business problem this solves?
4. **Testing requirements**: Can appropriate testing instructions be inferred?

**If ANY of these are unclear, ask the user for clarification before proceeding.**

### PR Description Creation Process

1. **Analyze** the gathered information to understand purpose, scope, and impact
2. **Fill the template** following `.github/pull_request_template.md` structure
4. **Remove all HTML comments** - delete `<!-- -->` comment blocks after addressing their content
5. **Save** to `tmp/pull-requests/{branch-name}.md` (replace "/" with "-" in branch names)
6. **Open** the file for user review
7. **Output** the GitHub CLI command as a markdown code block

### Template Requirements

- **Follow** `.github/pull_request_template.md` structure exactly
- **Remove** sections that don't apply (don't leave empty or "N/A")
- **Include** specific file paths, commands, and testing instructions
- **Focus** on user/business value in summary and context
- **Complete** all checklist items or explain why they don't apply
- **No placeholders** - all content must be meaningful and specific
- **Remove all HTML comments** - delete `<!-- -->` comment blocks after addressing their content

### Section Handling Rules

- **Deployment Notes**: Only include if there are actual deployment considerations (environment variables, database migrations, etc.). If no special steps needed, omit the entire section.
- **Related Links**: Only include if there are actual links to issues, documentation, or related PRs. If none exist, omit the entire section.
- **Checkboxes**:
  - Check boxes that are completed: `- [x] Completed item`
  - Leave unchecked boxes that need action: `- [ ] Action needed`
  - For sections that don't apply, add explanation: `- [ ] Not applicable: <reason>`

**Examples of proper section handling:**

- If no deployment considerations: Remove entire "📦 Deployment Notes" section
- If no related links: Remove entire "🔗 Related Links" section

### Comment Handling

- **Remove all HTML comments** (`<!-- -->`) from the final PR description
- **Address comment content** before removing - ensure all guidance is followed
- **No placeholder text** should remain in the final description
- **Clean, production-ready** markdown without development artifacts

## Branch Naming

Preferred patterns:

```text
<type>/<short-description>[-<TICKET>]
<type>/<scope>-<short-description>[-<TICKET>]
```

Examples:

```text
feat/web-add-real-time-dashboard
fix/smart-contracts-prevent-overflow
CARROT-123/feat/app-implement-auth-flow
```

Ensure branch `type`/`scope` align with your commits. Note that PR titles now use clear, descriptive format rather than Conventional Commits format.

## GitHub CLI Command Output

After creating the PR description file, **output the command as a markdown code block** for the developer to execute manually:

### Command Template

```bash
gh pr create \
  -r carrot-foundation/developers \
  -t "<PR Title>" \
  -B <base-branch> \
  -F tmp/pull-requests/{branch-name}.md
```

**Important**: Remove any `!` characters from the PR title as they can cause GitHub CLI parsing issues.

### Command Options

- Replace `<PR Title>` with the actual PR title (clear, descriptive format)
- Replace `<base-branch>` with target branch (defaults to `main`)
- Replace `{branch-name}` with sanitized branch name (replacing "/" with "-")
- Include additional GitHub CLI options as needed

### Example Output

```bash
# Execute this command to create the PR:
gh pr create \
  -r carrot-foundation/developers \
  -t "Implement certificate minting system for recycling verification" \
  -B main \
  -F tmp/pull-requests/feat-smart-contracts-certificate-minting.md
```

