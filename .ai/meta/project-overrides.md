# Project-Specific Overrides

This document explains how to discover and apply project-specific rules that override or extend the generic organizational rules.

## Override Discovery Pattern

The `.ai/` folder contains **generic organizational rules** that apply across all Carrot Foundation projects. However, each project may have **project-specific overrides** located outside the `.ai/` folder.

### Standard Override Locations

AI assistants should check these locations for project-specific rules:

1. **Cursor**: `.cursor/rules/*.mdc` - Project-specific Cursor rules
2. **Claude**: `CLAUDE.md` - Project-specific Claude instructions
3. **Copilot**: `.github/copilot-instructions.md` - Project-specific Copilot instructions
4. **Generic**: Any markdown files matching project-specific patterns

### Discovery Process

When working on a project:

1. **Read generic rules** from `.ai/categories/` first
2. **Check for project overrides** in standard locations:
   - `.cursor/rules/` - Look for files with project-specific naming
   - `CLAUDE.md` - Check for project-specific sections
   - `.github/copilot-instructions.md` - Check for project-specific instructions
3. **Apply both** - Generic rules provide foundation, overrides provide project-specific details
4. **Override precedence** - Project-specific rules take precedence when they conflict

## Override Patterns

### Pattern Matching

AI assistants should look for files matching these patterns:

- `.cursor/rules/*-project.mdc` - Project-specific Cursor rules
- `.cursor/rules/*-overrides.mdc` - Project override rules
- `CLAUDE.md` - Contains project-specific instructions
- `.github/copilot-instructions.md` - Contains project-specific instructions
- `PROJECT.md` - Alternative project documentation file

### Content Indicators

Project-specific overrides typically contain:

- Project-specific commit scopes
- Project-specific directory structures
- Project-specific path aliases
- Project-specific naming conventions
- Project-specific tooling configurations

## Example Override Locations

### Cursor

```markdown
.cursor/rules/
├── ai-rules.mdc # Generic AI rules reference
└── {project-name}-project.mdc # Project-specific rules
```

### Claude

```markdown
CLAUDE.md # Contains both generic reference and project-specific sections
```

### Copilot

```markdown
.github/
└── copilot-instructions.md # Project-specific Copilot instructions
```

## Integration with Generic Rules

### Reading Order

1. **Start with generic rules** - Read from `.ai/categories/` based on task type
2. **Check for overrides** - Look in standard override locations
3. **Merge knowledge** - Combine generic and project-specific rules
4. **Apply with precedence** - Project-specific rules override generic rules

### Conflict Resolution

When generic and project-specific rules conflict:

- **Project-specific wins** - Overrides take precedence
- **Document the conflict** - Note when project deviates from organizational standards
- **Check for updates** - Verify if generic rules should be updated or if project needs alignment

## Best Practices

### For AI Assistants

- ✅ Always check standard override locations
- ✅ Read both generic and project-specific rules
- ✅ Apply project-specific rules when they exist
- ✅ Note when project deviates from organizational standards
- ✅ Reference both generic and project-specific rules in responses

### For Project Maintainers

- ✅ Place overrides in standard locations (`.cursor/rules/`, `CLAUDE.md`, etc.)
- ✅ Use descriptive file names (e.g., `{project}-project.mdc`)
- ✅ Reference generic rules in override files
- ✅ Document why project-specific rules differ from generic rules
- ✅ Keep overrides minimal - only override what's necessary

## Manifest Integration

The `manifest.json` may include an `overridePatterns` field in the future to specify custom override locations:

```json
{
  "overridePatterns": [".cursor/rules/*-project.mdc", "CLAUDE.md", ".github/copilot-instructions.md"]
}
```

For now, AI assistants should check the standard locations listed above.
