# Project-Specific Extensions

This document explains how to discover and apply project-specific rules that extend or refine the generic organizational rules.

## Extension Discovery Pattern

The `.ai/` folder contains **generic organizational rules** that apply across all Carrot Foundation projects. However, each project may have **project-specific extensions** located outside the `.ai/` folder that build upon and refine these generic rules.

### Standard Extension Locations

AI assistants should check these locations for project-specific rules:

1. **Cursor**: `.cursor/rules/*-project.mdc` or `.cursor/rules/*-extensions.mdc` - Project-specific Cursor rules
2. **Claude**: `CLAUDE.md` - Project-specific Claude instructions
3. **Copilot**: `.github/copilot-instructions.md` - Project-specific Copilot instructions
4. **Generic**: Any markdown files matching project-specific patterns

### Discovery Process

When working on a project:

1. **Read generic rules** from `.ai/categories/` first
2. **Check for project extensions** in standard locations:
   - `.cursor/rules/` - Look for files with project-specific naming (e.g., `*-project.mdc`)
   - `CLAUDE.md` - Check for project-specific sections
   - `.github/copilot-instructions.md` - Check for project-specific instructions
3. **Apply both** - Generic rules provide foundation, extensions provide project-specific details
4. **Extension precedence** - Project-specific rules take precedence when they conflict with generic rules

## Extension Patterns

### Pattern Matching

AI assistants should look for files matching these patterns (defined in `manifest.json.extensionPatterns`):

- `.cursor/rules/*-project.mdc` - Project-specific Cursor rules
- `.cursor/rules/*-extensions.mdc` - Project extension rules
- `CLAUDE.md` - Contains project-specific instructions
- `.github/copilot-instructions.md` - Contains project-specific instructions
- `PROJECT.md` - Alternative project documentation file

### Content Indicators

Project-specific extensions typically contain:

- Project-specific commit scopes
- Project-specific directory structures
- Project-specific path aliases
- Project-specific naming conventions
- Project-specific tooling configurations

## Example Extension Locations

### Cursor

```markdown
.cursor/rules/
├── ai-rules.mdc # Generic AI rules reference
└── {project-name}-project.mdc # Project-specific extensions
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
2. **Check for extensions** - Look in standard extension locations
3. **Merge knowledge** - Combine generic and project-specific rules
4. **Apply with precedence** - Project-specific extensions take precedence when they conflict

### Conflict Resolution

When generic and project-specific rules conflict:

- **Project-specific wins** - Extensions take precedence
- **Document the deviation** - Note when project deviates from organizational standards
- **Check for updates** - Verify if generic rules should be updated or if project needs alignment

## Best Practices

### For AI Assistants

- ✅ Always check standard extension locations
- ✅ Read both generic and project-specific rules
- ✅ Apply project-specific extensions when they exist
- ✅ Note when project deviates from organizational standards
- ✅ Reference both generic and project-specific rules in responses

### For Project Maintainers

- ✅ Place extensions in standard locations (`.cursor/rules/`, `CLAUDE.md`, etc.)
- ✅ Use descriptive file names (e.g., `{project}-project.mdc`)
- ✅ Reference generic rules in extension files
- ✅ Document why project-specific rules differ from generic rules
- ✅ Keep extensions minimal - only extend what's necessary
- ✅ Prefer extending over overriding when possible

## Manifest Integration

The `manifest.json` includes an `extensionPatterns` field that specifies standard extension locations:

```json
{
  "extensionPatterns": [".cursor/rules/*-project.mdc", ".cursor/rules/*-extensions.mdc", "CLAUDE.md", ".github/copilot-instructions.md", "PROJECT.md"]
}
```

AI assistants should check these patterns to discover project-specific extensions.

## Extension vs Override

While we use "extensions" as the primary term, extensions can:

- **Extend**: Add new project-specific rules that don't exist in generic rules
- **Refine**: Provide more specific guidance for project context
- **Override**: Replace generic rules when project needs differ significantly

The term "extensions" emphasizes that most project-specific rules build upon generic rules rather than replace them entirely.
