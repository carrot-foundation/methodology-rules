# Tool Integration Guides

This document provides tool-specific instructions for integrating the `.ai` folder rules with different AI assistants.

## Cursor

### Basic Integration

Cursor automatically reads rules from `.cursor/rules/` directories. For the `.ai` folder:

1. **Reference in Cursor Rules**: Create a `.cursor/rules/ai-rules.mdc` file that references the `.ai` folder:

```markdown
---
description: Reference to Carrot Foundation AI development rules
---

# Carrot Foundation AI Rules

These rules are located in `.ai/` folder. Always read the actual rule files when working on tasks.

## Quick Reference

- Code Quality: `.ai/categories/code-quality/`
- Workflow: `.ai/categories/workflow/`
- Documentation: `.ai/categories/documentation/`

## Usage

When working on a task:

1. Check `manifest.json` for relevant rules
2. Read the specific rule file based on task type
3. Apply rules based on priority (required > recommended > optional)
```

2. **Direct File References**: Cursor can read markdown files directly. Reference rules like:

```markdown
See `.ai/categories/code-quality/code-style.md` for naming conventions.
```

### Advanced Integration

- **Use globs**: Cursor supports glob patterns in rule files
- **File-specific rules**: Use `globs` in frontmatter to apply rules to specific file types
- **Always apply**: Use `alwaysApply: true` for rules that should always be considered

## Claude (Anthropic)

### Automatic Configuration (Claude Code/Desktop)

Claude Code and Claude Desktop can automatically read project instructions without manual references. Create a `CLAUDE.md` file in your project root:

**Create `CLAUDE.md` in project root:**

```markdown
# Carrot Foundation Development Guidelines

Development guidelines are located in the `.ai/` folder. Always read the actual rule files when working on tasks.

## Rule Discovery

Start by reading `.ai/manifest.json` to discover all available rules. The manifest provides:

- Complete list of all rules organized by category
- File paths for each rule
- Metadata (priority, appliesTo, tools, version)
- Related rules for context

## Quick Reference

- **Code Quality**: `.ai/categories/code-quality/` - Code style, TypeScript, testing, comments
- **Workflow**: `.ai/categories/workflow/` - Commits, PRs, branch naming, ClickUp tasks
- **Documentation**: `.ai/categories/documentation/` - Markdown standards

## Usage Guidelines

When working on a task:

1. Check `.ai/manifest.json` for relevant rules
2. Read the specific rule file based on task type
3. Apply rules based on priority (required > recommended > optional)
4. Check `appliesTo` field to ensure rules match your context
5. Check for project-specific extensions in standard locations (see `.ai/meta/project-extensions.md`)

## Common Workflows

### Writing TypeScript Code

- Read `.ai/categories/code-quality/code-style.md`
- Read `.ai/categories/code-quality/typescript.md`
- Read `.ai/categories/code-quality/code-comments.md` (recommended)

### Creating a Pull Request

- Read `.ai/categories/workflow/pull-request.md`
- Read `.ai/categories/workflow/commit.md` (for commit history context)
- Read `.ai/categories/workflow/branch-naming.md` (to verify branch name)

### Writing Documentation

- Read `.ai/categories/documentation/markdown.md`

## Important Notes

- **Always read the full rule file**, not just summaries in `instructions.md`
- **Check relatedRules** in frontmatter for complete context
- **Rules are generic** - These are organizational standards, project-specific rules belong in project repos
- **Rules are versioned** - Check version in frontmatter and manifest.json
```

**Optional: Create `.claude/settings.json` for configuration:**

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "permissionMode": "acceptEdits",
  "contextLimit": 10
}
```

Claude Code/Desktop will automatically read `CLAUDE.md` when you open the project, providing context-aware assistance without manual references.

### System Prompt Integration (Manual)

Include in your Claude system prompt or instructions:

```
You are working with the Carrot Foundation codebase. Development guidelines are located in the `.ai/` folder.

To use these rules:
1. Read `.ai/manifest.json` to discover available rules
2. Read specific rule files based on the task:
   - Writing code? Read `.ai/categories/code-quality/`
   - Creating PRs? Read `.ai/categories/workflow/pull-request.md`
   - Writing docs? Read `.ai/categories/documentation/markdown.md`
3. Always read the full rule file, not just summaries
4. Check rule priority: required rules must be followed, recommended rules are best practices
5. Check for project-specific extensions in standard locations:
   - `.cursor/rules/*-project.mdc` (Cursor)
   - `CLAUDE.md` (Claude - this file may contain project-specific sections)
   - `.github/copilot-instructions.md` (Copilot)

Rules are versioned and tool-agnostic. Always check the `appliesTo` field to ensure rules match your context. Project-specific extensions take precedence over generic rules.
```

### File Attachment

Claude can read files directly. Attach or reference:

- `manifest.json` for rule discovery
- Specific rule files when needed
- `README.md` for overview

### Custom Instructions

Add to Claude's custom instructions:

```
When working on Carrot Foundation projects:
- Always check `.ai/manifest.json` for relevant rules
- Read rule files from `.ai/categories/` based on task type
- Apply rules based on priority (required > recommended)
- Check for project-specific extensions in standard locations (see `.ai/meta/project-extensions.md`)
```

## GitHub Copilot

### Configuration

1. **Create `.github/copilot-instructions.md`**:

```markdown
# Copilot Instructions

Follow Carrot Foundation development guidelines from `.ai/` folder.

## Rule Discovery

- Check `.ai/manifest.json` for available rules
- Read rules from `.ai/categories/` based on context

## Code Quality

- Follow `.ai/categories/code-quality/code-style.md` for naming and structure
- Follow `.ai/categories/code-quality/typescript.md` for TypeScript patterns
- Follow `.ai/categories/code-quality/testing.md` for test structure

## Workflow

- Follow `.ai/categories/workflow/commit.md` for commit messages
- Follow `.ai/categories/workflow/pull-request.md` for PR creation
```

2. **Reference in Code Comments**:

```typescript
// Follows: .ai/categories/code-quality/code-style.md
function calculateReward(input: RewardInput): number {
  // Implementation
}
```

### Chat Integration

In Copilot Chat, reference rules:

```
When writing code, follow the rules in .ai/categories/code-quality/
When creating commits, follow .ai/categories/workflow/commit.md
```

## Generic Integration Pattern

### For Any AI Tool

1. **Read manifest.json first**:

   ```json
   {
     "rules": {
       "code-quality": { ... },
       "workflow": { ... }
     }
   }
   ```

2. **Filter by context**:

   - Check `appliesTo` field
   - Check `tools` field
   - Check `priority` field

3. **Read rule files**:

   - Read full rule file, not summaries
   - Check `relatedRules` for context
   - Follow examples in rules

4. **Apply rules**:
   - Required: Always apply
   - Recommended: Apply as best practices
   - Optional: Reference when relevant

### Programmatic Access

```javascript
// Example: Load and filter rules
const manifest = require('./.ai/manifest.json');

function getRelevantRules(context, tool) {
  const rules = [];

  for (const category of Object.values(manifest.rules)) {
    for (const rule of Object.values(category)) {
      if (rule.appliesTo.includes(context) || rule.appliesTo.includes('all')) {
        if (rule.tools.includes(tool) || rule.tools.includes('all')) {
          rules.push({
            ...rule,
            content: require(`./.ai/${rule.file}`),
          });
        }
      }
    }
  }

  return rules.sort((a, b) => {
    const priority = { required: 3, recommended: 2, optional: 1 };
    return priority[b.priority] - priority[a.priority];
  });
}
```

## Best Practices

### Do

- ✅ Read `manifest.json` for rule discovery
- ✅ Filter rules by `appliesTo` and `tools`
- ✅ Read full rule files, not summaries
- ✅ Check `relatedRules` for context
- ✅ Respect `priority` (required > recommended > optional)

### Don't

- ❌ Apply rules outside their context
- ❌ Ignore `required` priority rules
- ❌ Rely solely on summaries
- ❌ Cache rules without version awareness
- ❌ Apply project-specific rules from other repos

## Troubleshooting

### Rules Not Being Applied

1. **Check tool compatibility**: Verify rule `tools` field includes your tool
2. **Check context**: Verify rule `appliesTo` matches your context
3. **Check priority**: Required rules should always apply
4. **Read full file**: Don't rely on summaries

### Conflicting Rules

1. **Check project extensions**: Project may have specific extensions
2. **Check rule versions**: Ensure you're using current versions
3. **Check relatedRules**: May provide additional context
4. **Ask user**: When in doubt, clarify rather than guess

### Version Issues

1. **Check frontmatter**: Rule files have version in frontmatter
2. **Check manifest.json**: Global version and per-rule versions
3. **Read migration notes**: Major version changes may have migration guidance
4. **Update cached knowledge**: Don't rely on old rule versions
