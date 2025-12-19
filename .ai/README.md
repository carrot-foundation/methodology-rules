# Carrot Foundation AI Development Rules

This folder contains organizational development guidelines that apply across all Carrot Foundation projects. These are **generic standards** that should be used as a baseline, though **project-specific guidelines may extend or refine these standards** when documented at the project level.

## Quick Start

1. Read this README for overview
2. Check `manifest.json` for all available rules
3. Read category-specific rules as needed
4. See `meta/how-to-use.md` for AI assistant integration

## Categories

### Code Quality

Standards for code style, TypeScript usage, testing, and code comments.

- [Code Style](categories/code-quality/code-style.md) - Naming conventions, file organization, control flow
- [TypeScript](categories/code-quality/typescript.md) - Compiler settings, module organization, best practices
- [Testing](categories/code-quality/testing.md) - Unit and component testing expectations
- [Code Comments](categories/code-quality/code-comments.md) - Guidelines for essential code comments

### Workflow

Git workflow, pull requests, branch naming, and task management standards.

- [Commits](categories/workflow/commit.md) - Conventional Commits specification
- [Pull Requests](categories/workflow/pull-request.md) - PR workflow and template requirements
- [Branch Naming](categories/workflow/branch-naming.md) - Git branch naming conventions
- [ClickUp Tasks](categories/workflow/clickup-task.md) - Task creation and refinement guidelines

### Documentation

Standards for writing clear, consistent documentation.

- [Markdown](categories/documentation/markdown.md) - Markdown documentation standards

## Tool Integration

- [Cursor](meta/tool-integration.md#cursor) - How to integrate with Cursor
- [Claude](meta/tool-integration.md#claude) - How to integrate with Claude
- [GitHub Copilot](meta/tool-integration.md#copilot) - How to integrate with GitHub Copilot

## Structure

```
.ai/
├── README.md                    # This file - navigation hub
├── manifest.json                # Structured metadata for all rules
├── instructions.md              # Compatibility layer and summary
├── categories/
│   ├── code-quality/           # Code quality standards
│   ├── workflow/               # Git and task management workflow
│   └── documentation/         # Documentation standards
└── meta/
    ├── how-to-use.md           # How AI assistants consume rules
    ├── versioning.md           # Versioning strategy
    ├── tool-integration.md     # Tool-specific integration guides
    └── project-extensions.md    # How to discover project-specific extensions
```

## Using These Rules

### For AI Assistants

1. **Read the manifest.json** to discover available rules
2. **Filter by context** - Use `appliesTo` and `tools` fields to determine relevant rules
3. **Check priority** - `required` rules should always be applied, `recommended` rules are best practices
4. **Follow relatedRules** - Read related rules for complete context
5. **Check for project extensions** - Look in standard extension locations (see [meta/project-extensions.md](./meta/project-extensions.md))
6. **See meta/how-to-use.md** for detailed consumption guidelines

### For Developers

1. **Start with instructions.md** - Provides a summary overview
2. **Read specific rules** - When working on a task, read the relevant rule file directly
3. **Check project extensions** - Always verify if your project has specific extensions in:
   - `.cursor/rules/*-project.mdc` (for Cursor)
   - `CLAUDE.md` (for Claude)
   - `.github/copilot-instructions.md` (for Copilot)
4. **Reference manifest.json** - For programmatic access or tooling integration

## Adding New Rules

1. Create the rule file in the appropriate category directory
2. Add YAML frontmatter with required metadata
3. Update `manifest.json` with the new rule
4. Update this README with a link to the new rule
5. Update `instructions.md` if the rule should be highlighted

## Versioning

Rules are versioned using semantic versioning. See `meta/versioning.md` for details on:

- How rules are versioned
- Breaking change policy
- Migration strategies

## Important Notes

- **Generic Rules Only**: These rules are intentionally generic and apply across all projects
- **Project Extensions**: Project-specific rules belong **outside** the `.ai/` folder in standard locations (`.cursor/rules/`, `CLAUDE.md`, `.github/copilot-instructions.md`)
- **Extension Discovery**: See [meta/project-extensions.md](./meta/project-extensions.md) for how to discover project-specific extensions
- **Tool Agnostic**: Rules are written in markdown with frontmatter to work across all AI tools
- **Always Read Source**: When in doubt, read the actual rule file rather than relying on summaries

## Questions?

- See `meta/how-to-use.md` for AI assistant integration questions
- See `meta/tool-integration.md` for tool-specific setup
- See `meta/versioning.md` for versioning questions
