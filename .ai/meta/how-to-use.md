# How AI Assistants Should Use These Rules

This guide explains how AI assistants should discover, filter, and apply the rules in this `.ai` folder.

## Discovery Process

### 1. Read the Manifest

Start by reading `manifest.json` to discover all available rules:

```json
{
  "version": "1.0.0",
  "rules": {
    "code-quality": { ... },
    "workflow": { ... }
  }
}
```

The manifest provides:

- Complete list of all rules
- File paths for each rule
- Metadata (priority, appliesTo, tools, version)
- Related rules for context

### 2. Filter by Context

Use the `appliesTo` field to determine which rules are relevant:

- `["typescript", "javascript"]` - Only apply when working with TypeScript/JavaScript
- `["all"]` - Always apply (e.g., commit messages, PRs)
- `["markdown"]` - Only apply when working with markdown files

### 3. Check Tool Compatibility

The `tools` field indicates which AI tools should use the rule:

- `["cursor", "claude", "copilot", "all"]` - Universal rule
- `["cursor"]` - Cursor-specific (rare, most rules are tool-agnostic)

### 4. Respect Priority

- **required**: Always apply these rules when context matches
- **recommended**: Apply as best practices, but allow flexibility
- **optional**: Reference when relevant, but not mandatory

## Application Strategy

### When to Read Rules

1. **On task start**: Read relevant rules based on the task type

   - Writing code? → Read code-quality rules
   - Creating a PR? → Read workflow/pull-request.md
   - Writing docs? → Read documentation/markdown.md

2. **During execution**: Reference rules when making decisions

   - Naming a function? → Check code-style.md
   - Writing a commit? → Check workflow/commit.md

3. **Before completion**: Verify compliance with required rules

### How to Read Rules

1. **Read the full rule file** - Don't rely on summaries in instructions.md
2. **Check relatedRules** - Read related rules for complete context
3. **Follow examples** - Rules include examples showing correct patterns
4. **Respect project extensions** - Always check if project has specific extensions

### Rule Priority Logic

```javascript
// Pseudo-code for rule application
function shouldApplyRule(rule, context) {
  // 1. Check if rule applies to current context
  if (!rule.appliesTo.includes(context.type) && !rule.appliesTo.includes('all')) {
    return false;
  }

  // 2. Check tool compatibility
  if (!rule.tools.includes(currentTool) && !rule.tools.includes('all')) {
    return false;
  }

  // 3. Required rules always apply
  if (rule.priority === 'required') {
    return true;
  }

  // 4. Recommended rules apply as best practices
  if (rule.priority === 'recommended') {
    return true; // Apply but allow flexibility
  }

  // 5. Optional rules are reference-only
  return false;
}
```

## Example Workflows

### Writing TypeScript Code

1. Read `categories/code-quality/code-style.md`
2. Read `categories/code-quality/typescript.md`
3. Read `categories/code-quality/code-comments.md` (recommended)
4. Apply rules when:
   - Naming functions/variables
   - Organizing files
   - Writing type definitions
   - Adding comments

### Creating a Pull Request

1. Read `categories/workflow/pull-request.md`
2. Read `categories/workflow/commit.md` (for commit history context)
3. Read `categories/workflow/branch-naming.md` (to verify branch name)
4. Follow the PR creation workflow:
   - Gather information
   - Assess context sufficiency
   - Create description using template
   - Output GitHub CLI command

### Writing Documentation

1. Read `categories/documentation/markdown.md`
2. Apply rules for:
   - Document structure
   - Header formatting
   - Code block language tags
   - Link formatting

## Project-Specific Extensions

The `.ai/` folder contains **generic organizational rules**. Each project may have **project-specific extensions** located outside the `.ai/` folder that build upon and refine these generic rules.

### Extension Discovery

Check these standard locations for project-specific rules:

1. **Cursor**: `.cursor/rules/*-project.mdc` or `.cursor/rules/*-extensions.mdc`
2. **Claude**: `CLAUDE.md` (project-specific sections)
3. **Copilot**: `.github/copilot-instructions.md`
4. **Generic**: Files matching patterns in `manifest.json.extensionPatterns`

See [project-extensions.md](./project-extensions.md) for complete extension discovery patterns.

### Reading Order

1. Read generic rules from `.ai/categories/`
2. Check for project extensions in standard locations
3. Apply both, with project-specific rules taking precedence

## Best Practices

### Do

- ✅ Read the actual rule file, not just summaries
- ✅ Check relatedRules for complete context
- ✅ Filter rules by `appliesTo` and `tools`
- ✅ Always apply `required` priority rules
- ✅ Reference `recommended` rules as best practices
- ✅ Check for project-specific extensions in standard locations
- ✅ Apply project-specific extensions when they exist

### Don't

- ❌ Apply rules outside their `appliesTo` context
- ❌ Ignore `required` priority rules
- ❌ Rely solely on instructions.md summaries
- ❌ Look for project-specific rules inside `.ai/` folder (they're outside)
- ❌ Skip reading relatedRules

## Error Handling

If a rule is unclear or conflicts with project requirements:

1. **Check for project extensions** - Project may have specific extensions
2. **Read relatedRules** - May provide additional context
3. **Ask the user** - When in doubt, clarify rather than guess
4. **Follow the spirit** - Apply the intent even if exact wording doesn't match

## Version Awareness

- Rules are versioned in frontmatter and manifest.json
- Check `lastUpdated` to ensure you're using current guidance
- Breaking changes will increment major version
- See `meta/versioning.md` for versioning strategy

## Integration with Tools

See `meta/tool-integration.md` for tool-specific integration instructions:

- Cursor: How to reference `.ai` folder
- Claude: How to include in system prompts
- GitHub Copilot: How to configure rules
