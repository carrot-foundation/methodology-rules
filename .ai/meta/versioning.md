# Versioning Strategy

This document explains how rules are versioned and how to handle version changes.

## Version Format

Rules use **semantic versioning** (semver): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes that require action from users/AI assistants
- **MINOR**: New rules or non-breaking additions
- **PATCH**: Bug fixes, clarifications, typo corrections

## Version Locations

### Rule Files

Each rule file has version in frontmatter:

```yaml
---
version: '1.0.0'
lastUpdated: '2025-01-27'
---
```

### Manifest

The `manifest.json` has:

- Global version (current: `1.0.0`)
- Per-rule versions in metadata
- `lastUpdated` timestamp

## Versioning Rules

### Major Version (Breaking Changes)

Increment when:

- Rule requirements fundamentally change
- Previously valid patterns become invalid
- New mandatory requirements are added
- Rule scope significantly changes

**Example**: If commit message format changes from `type: message` to `type(scope): message`, that's a major version change.

### Minor Version (Additions)

Increment when:

- New optional guidelines are added
- Examples are expanded
- Related rules are added
- Non-breaking clarifications are made

**Example**: Adding a new optional commit type or expanding examples.

### Patch Version (Fixes)

Increment when:

- Typos are corrected
- Examples are fixed
- Clarifications are made without changing requirements
- Formatting is improved

**Example**: Fixing a typo in an example or clarifying ambiguous wording.

## Automated Versioning

**Version updates are automated** via `standard-version` library, `scripts/version-ai-rules.js` wrapper, and Husky post-commit hook.

### How It Works

1. **Automatic execution**: After each commit, the script checks if `.ai/` files were changed
2. **Commit analysis**: Parses the commit message to determine version bump type
3. **Version update**: Uses `standard-version` to update `manifest.json` version
4. **Frontmatter sync**: `update-ai-frontmatter-versions.js` runs as prerelease hook to sync all rule file frontmatter
5. **Date update**: Updates `lastUpdated` timestamps to current date

### Version Bump Logic

The script uses `standard-version` which follows Conventional Commits to determine bump type:

- **BREAKING CHANGE** or `BREAKING:` → Major version (1.0.0 → 2.0.0)
- **feat** → Minor version (1.0.0 → 1.1.0)
- **fix**, **refactor**, **docs**, **style**, **test**, **chore**, **perf**, **build**, **ci** → Patch version (1.0.0 → 1.0.1)

### Manual Execution

You can also run the script manually:

```bash
pnpm version:ai
# or
node scripts/version-ai-rules.js
```

### Library Used

This implementation uses [`standard-version`](https://github.com/conventional-changelog/standard-version), an open-source library that:

- Follows Semantic Versioning and Conventional Commits
- Handles version calculation logic
- Updates JSON files automatically
- Provides hooks for custom file updates (YAML frontmatter)

Configuration is in `.versionrc.json`.

### Manual Version Updates

If you need to manually update versions (rare):

1. Update version in rule file frontmatter
2. Update `lastUpdated` date
3. Update version in `manifest.json` for that rule
4. Update global `lastUpdated` in `manifest.json` if significant

**Note**: Manual updates are usually not needed - the automated script handles this.

### Global Version Updates

The global version in `manifest.json` is automatically updated when:

- Any `.ai/` files are changed in a commit
- The script runs via post-commit hook
- All rule versions are synchronized to the global version

## Migration Strategy

### For Breaking Changes

When a rule has a breaking change:

1. **Document the change** in the rule file
2. **Provide migration examples** showing old vs new patterns
3. **Update related rules** if they reference the changed rule
4. **Update manifest.json** with new version
5. **Consider deprecation period** for major changes

### For AI Assistants

When encountering a version change:

1. **Check version in frontmatter** - Ensure you're reading current version
2. **Read migration notes** - If major version changed, look for migration guidance
3. **Update cached knowledge** - Don't rely on old rule versions
4. **Verify with manifest.json** - Cross-reference version numbers

## Version History

### 1.0.1 (2025-12-05)

- Automated versioning script implemented
- Post-commit hook added for automatic version updates

### 1.0.0 (2025-01-27)

- Initial structured release
- All rules migrated to new hierarchical structure
- Frontmatter metadata added to all rules
- Manifest.json created

## Best Practices

### For Rule Maintainers

- **Version conservatively** - Only increment major when truly breaking
- **Document changes** - Add notes for breaking changes
- **Update dates** - Keep `lastUpdated` current
- **Coordinate updates** - Update related rules together when needed

### For AI Assistants

- **Check versions** - Verify you're using current rule versions
- **Respect breaking changes** - Major version changes require attention
- **Read migration notes** - When major version changes, look for guidance
- **Cache carefully** - Don't cache rule content without version awareness

## Version Compatibility

### Backward Compatibility

- **Minor and patch updates**: Fully backward compatible
- **Major updates**: May break compatibility, check migration notes

### Cross-Rule Compatibility

Rules are designed to work together:

- Related rules reference each other via `relatedRules`
- Version changes in one rule may require updates to related rules
- Manifest.json tracks all rule versions for compatibility checking

## Future Considerations

### Versioning Tools

Consider implementing:

- Automated version checking
- Compatibility validation
- Migration path detection
- Version-aware rule loading

### Semantic Versioning Benefits

- Clear communication of change impact
- Enables automated compatibility checking
- Supports gradual migration strategies
- Provides version history tracking
