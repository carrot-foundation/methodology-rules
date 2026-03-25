#!/usr/bin/env tsx

/**
 * Generates README.md files for each rule processor (from rule-definition.ts
 * data and git contributor information) and the repository's codecov.yml
 * configuration.
 *
 * Usage: npx tsx scripts/generate-rule-readmes.ts
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const LIB_RULE_PROCESSORS = path.join(
  ROOT,
  'libs',
  'methodologies',
  'bold',
  'rule-processors',
);
const APPS_METHODOLOGIES = path.join(ROOT, 'apps', 'methodologies');

const SCOPE_TO_LIB: Record<string, string> = {
  'gas-id': 'mass-id-certificate',
  'mass-certificate': 'mass-id-certificate',
  'recycled-id': 'mass-id-certificate',
};

const SLUG_TO_LIB: Record<string, string> = {
  'no-conflicting-gas-id-or-credit': 'no-conflicting-certificate-or-credit',
  'no-conflicting-recycled-id-or-credit':
    'no-conflicting-certificate-or-credit',
  'recycling-manifest-data': 'document-manifest-data',
  'transport-manifest-data': 'document-manifest-data',
};

const METHODOLOGY_DISPLAY_NAMES: Record<string, string> = {
  'bold-carbon': 'BOLD Carbon',
  'bold-recycling': 'BOLD Recycling',
};

const EMAIL_TO_GITHUB: Record<string, string> = {
  'marcos-12marcos@hotmail.com': 'AMarcosCastelo',
  'amarcoscastelo@gmail.com': 'AMarcosCastelo',
  'andtankian@gmail.com': 'andtankian',
  'cristianorsantos.95@gmail.com': 'cris-santos',
  'gabrielopes31@gmail.com': 'gabrielsl96',
  '49005645+gabrielsl96@users.noreply.github.com': 'gabrielsl96',
  'gsousalucas@outlook.com': 'gabrielsl96',
  'rafaeldonizetip@gmail.com': 'RafaPalau',
  'sangalli@gmail.com': 'sangalli',
  'rafael.sangalli@solidos.com': 'sangalli',
};

const BOT_ACCOUNTS = new Set([
  'renovate[bot]',
  'carrot-fndn-admin',
  'solidos-admin',
]);

interface FrameworkRule {
  description: string;
  name: string;
  slug: string;
}

interface RuleDefinitionData {
  description: string;
  events: string[];
  name: string;
  slug: string;
}

interface ReadmeInput {
  codecovFlag: string;
  contributors: string[];
  description: string;
  events: string[];
  frameworkRules: FrameworkRule[];
  implRelPath: string;
  methodology: string;
  name: string;
}

function dirExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

function resolveLibCoordinates(
  scope: string,
  slug: string,
): { libScope: string; libSlug: string } {
  return {
    libScope: SCOPE_TO_LIB[scope] ?? scope,
    libSlug: SLUG_TO_LIB[slug] ?? slug,
  };
}

function getLibSrcPath(scope: string, slug: string): string {
  const { libScope, libSlug } = resolveLibCoordinates(scope, slug);
  return path.join(LIB_RULE_PROCESSORS, libScope, libSlug, 'src');
}

function getCodecovFlag(scope: string, slug: string): string {
  const { libScope, libSlug } = resolveLibCoordinates(scope, slug);
  return `${libScope}--${libSlug}`;
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Dynamically loads the MethodologyDocumentEventName enum from the source file.
 * This file has no Typia in its import chain, so it's safe to import at runtime.
 * Bold's DocumentEventName extends it with END and MOVE (added via BOLD_EXTRA_EVENT_NAMES).
 */
async function loadDocumentEventNames(): Promise<Record<string, string>> {
  const enumFilePath = path.join(
    ROOT,
    'libs',
    'shared',
    'types',
    'src',
    'methodology',
    'methodology-enum.types.ts',
  );

  const mod = await import(enumFilePath);
  const baseEnum: Record<string, string> =
    mod.MethodologyDocumentEventName ??
    mod.default?.MethodologyDocumentEventName;

  if (!baseEnum || typeof baseEnum !== 'object') {
    throw new Error(
      `Failed to load MethodologyDocumentEventName from ${enumFilePath}. ` +
        `Got: ${typeof baseEnum}. Ensure the enum is exported correctly.`,
    );
  }

  return baseEnum;
}

function extractRuleDefinition(
  srcPath: string,
  slug: string,
  documentEventNames: Record<string, string>,
): RuleDefinitionData | undefined {
  const libSlug = SLUG_TO_LIB[slug] ?? slug;
  const files = dirExists(srcPath) ? fs.readdirSync(srcPath) : [];
  const ruleDefFile = files.find((f) => f.endsWith('.rule-definition.ts'));

  if (!ruleDefFile) return undefined;

  const content = fs.readFileSync(path.join(srcPath, ruleDefFile), 'utf8');

  const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/);
  const descMatch = content.match(
    /description:\s*\n?\s*['"`]([^'"`]+)['"`]/s,
  );
  const slugMatch = content.match(/slug:\s*['"`]([^'"`]+)['"`]/);

  // When the app slug differs from the lib slug (SLUG_TO_LIB mapping),
  // derive the name from the app slug instead of using the shared lib's name
  const hasSlugMapping = SLUG_TO_LIB[slug] !== undefined;
  const name = hasSlugMapping
    ? slugToTitle(slug)
    : (nameMatch?.[1] ?? libSlug);

  // Extract events: DocumentEventName.MEMBER references
  const eventsMatch = content.match(/events:\s*\[([\s\S]*?)\]/);
  const events: string[] = [];
  if (eventsMatch) {
    const memberMatches = eventsMatch[1].matchAll(
      /DocumentEventName\.(\w+)/g,
    );
    for (const m of memberMatches) {
      const value = documentEventNames[m[1]];
      if (value) {
        events.push(value);
      }
    }
  }

  return {
    description: descMatch?.[1]?.trim() ?? '',
    events,
    name,
    slug: slugMatch?.[1] ?? libSlug,
  };
}

function extractFrameworkRuleSlugs(appRuleDefPath: string): string[] {
  if (!fileExists(appRuleDefPath)) return [];

  const content = fs.readFileSync(appRuleDefPath, 'utf8');
  const match = content.match(/frameworkRules:\s*\[([\s\S]*?)\]/);
  if (!match) return [];

  const slugs: string[] = [];
  const stringMatches = match[1].matchAll(/['"`]([^'"`]+)['"`]/g);
  for (const m of stringMatches) {
    slugs.push(m[1]);
  }

  return slugs;
}

async function loadFrameworkRules(
  methodology: string,
): Promise<Map<string, FrameworkRule>> {
  const filePath = path.join(
    ROOT,
    'libs',
    'methodologies',
    methodology,
    'rules',
    'src',
    'framework-rules.ts',
  );

  if (!fileExists(filePath)) {
    return new Map();
  }

  // Dynamic import: tsx puts named exports under .default for CJS compat
  const mod = await import(filePath);
  const rules: unknown =
    mod.frameworkRules ?? mod.default?.frameworkRules ?? mod.default;

  if (!Array.isArray(rules)) {
    throw new Error(
      `Failed to load frameworkRules from ${filePath}. ` +
        `Got: ${typeof rules}. Ensure the array is exported correctly.`,
    );
  }

  const map = new Map<string, FrameworkRule>();

  for (const rule of rules as FrameworkRule[]) {
    map.set(rule.slug, rule);
  }

  return map;
}

function resolveGitHubUsername(email: string): string | undefined {
  if (email.includes('[bot]')) return undefined;

  const mapped = EMAIL_TO_GITHUB[email];
  if (mapped) return mapped;

  // Handle GitHub noreply emails: ID+username@users.noreply.github.com
  const noreplyMatch = email.match(
    /^\d+\+([^@]+)@users\.noreply\.github\.com$/,
  );
  if (noreplyMatch) return noreplyMatch[1];

  return undefined;
}

function getContributors(dirPath: string): string[] {
  let output: string;
  try {
    output = execFileSync(
      'git',
      ['log', '--format=%aE', '--', dirPath],
      { cwd: ROOT, encoding: 'utf8' },
    );
  } catch (error: unknown) {
    // If git itself is not available, this is a fatal error -- not a per-directory issue
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      throw new Error(
        `git is not installed or not in PATH: ${error.message}`,
        { cause: error },
      );
    }
    // Non-ENOENT errors (permissions, corrupt repo, etc.) must propagate so
    // formatContributorSection does not receive a misleading empty array.
    throw new Error(`git log failed for ${dirPath}`, { cause: error });
  }

  const emails = new Set(
    output
      .split('\n')
      .map((e) => e.trim())
      .filter(Boolean),
  );

  const usernames = new Set<string>();
  for (const email of emails) {
    const username = resolveGitHubUsername(email);
    if (username && !BOT_ACCOUNTS.has(username)) {
      usernames.add(username);
    }
  }

  return [...usernames].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
}

function formatContributorSection(usernames: string[]): string {
  if (usernames.length === 0) return '_No contributors found_';

  return usernames
    .map(
      (u) =>
        `[![${u}](https://images.weserv.nl/?url=avatars.githubusercontent.com/${u}&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/${u})`,
    )
    .join('\n');
}

function generateReadme(input: ReadmeInput): string {
  const {
    codecovFlag,
    contributors,
    description,
    events,
    frameworkRules,
    implRelPath,
    methodology,
    name,
  } = input;
  const methodologyDisplay =
    METHODOLOGY_DISPLAY_NAMES[methodology] ?? methodology;
  const contributorSection = formatContributorSection(contributors);

  let frameworkRulesSection = '';
  if (frameworkRules.length > 0) {
    const rows = frameworkRules
      .map((r) => `| ${r.name} | ${r.description} |`)
      .join('\n');
    frameworkRulesSection = `\n## 📋 Framework Rules

| Rule | Description |
|------|-------------|
${rows}
`;
  }

  let eventsSection = '';
  if (events.length > 0) {
    const items = events.map((e) => `- \`${e}\``).join('\n');
    eventsSection = `\n## 📡 Events

${items}
`;
  }

  return `<div align="center">

# ${name}

Methodology: **${methodologyDisplay}**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/methodology-rules/actions)
[![Coverage](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules/main?flag=${codecovFlag})](https://codecov.io/gh/carrot-foundation/methodology-rules?flags[0]=${codecovFlag})
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)

</div>

## 📄 Description

${description}
${frameworkRulesSection}${eventsSection}
## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/${implRelPath})**

## 👥 Contributors

${contributorSection}

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
`;
}

function generateCodecovYaml(): void {
  const scopes = fs
    .readdirSync(LIB_RULE_PROCESSORS)
    .filter((d) => dirExists(path.join(LIB_RULE_PROCESSORS, d)))
    .sort();

  const flags: Array<{ name: string; path: string }> = [];

  for (const scope of scopes) {
    const scopeDir = path.join(LIB_RULE_PROCESSORS, scope);
    const slugs = fs
      .readdirSync(scopeDir)
      .filter((d) => dirExists(path.join(scopeDir, d)))
      .sort();

    for (const slug of slugs) {
      flags.push({
        name: `${scope}--${slug}`,
        path: `libs/methodologies/bold/rule-processors/${scope}/${slug}/src/`,
      });
    }
  }

  const flagsYaml = flags
    .map(
      (f) =>
        `  ${f.name}:\n    paths:\n      - ${f.path}\n    carryforward: true`,
    )
    .join('\n\n');

  const content = `# Codecov configuration: coverage targets, PR comment layout, GitHub checks, and per-rule-processor flags.
# Flags are auto-uploaded by the "Upload flagged coverage per rule processor" CI step in backend-check.yaml.
# This file is generated by scripts/generate-rule-readmes.ts -- do not edit manually.

codecov:
  require_ci_to_pass: true

coverage:
  precision: 2
  round: down
  range: "90...100"

  status:
    project:
      default:
        target: 100%
        threshold: 1%
    patch:
      default:
        target: 100%
        threshold: 1%

comment:
  layout: "condensed_header,condensed_files,condensed_footer"
  behavior: default
  require_changes: false
  require_base: false
  require_head: true
  show_flags: true

github_checks:
  annotations: true

flags:
${flagsYaml}
`;

  fs.writeFileSync(path.join(ROOT, 'codecov.yml'), content, 'utf8');
}

// --- Main ---

function discoverRules(): Array<{
  appPath: string;
  methodology: string;
  scope: string;
  slug: string;
}> {
  const rules: Array<{
    appPath: string;
    methodology: string;
    scope: string;
    slug: string;
  }> = [];

  const methodologies = fs
    .readdirSync(APPS_METHODOLOGIES)
    .filter((d) =>
      dirExists(path.join(APPS_METHODOLOGIES, d, 'rule-processors')),
    );

  for (const methodology of methodologies) {
    const scopesDir = path.join(
      APPS_METHODOLOGIES,
      methodology,
      'rule-processors',
    );
    const scopes = fs
      .readdirSync(scopesDir)
      .filter((d) => dirExists(path.join(scopesDir, d)));

    for (const scope of scopes) {
      const rulesDir = path.join(scopesDir, scope);
      const slugs = fs
        .readdirSync(rulesDir)
        .filter((d) => dirExists(path.join(rulesDir, d)));

      for (const slug of slugs) {
        rules.push({
          appPath: path.join(rulesDir, slug),
          methodology,
          scope,
          slug,
        });
      }
    }
  }

  return rules;
}

async function main(): Promise<void> {
  const rules = discoverRules();

  // Dynamically load enum values and framework rules (Typia-free import chains)
  const documentEventNames = await loadDocumentEventNames();

  const methodologies = [...new Set(rules.map((r) => r.methodology))];
  const frameworkRulesMap = new Map<string, Map<string, FrameworkRule>>();

  for (const methodology of methodologies) {
    frameworkRulesMap.set(methodology, await loadFrameworkRules(methodology));
  }

  const readmePaths: string[] = [];
  let updated = 0;
  let skipped = 0;

  for (const { appPath, methodology, scope, slug } of rules) {
    const libSrcPath = getLibSrcPath(scope, slug);
    const ruleDef = extractRuleDefinition(libSrcPath, slug, documentEventNames);

    if (!ruleDef) {
      console.log(`  Skipping ${methodology}/${scope}/${slug}: no rule definition`);
      skipped++;
      continue;
    }

    const indexPath = path.join(libSrcPath, 'index.ts');
    if (!fileExists(indexPath)) {
      throw new Error(
        `Implementation file not found: ${indexPath} (methodology=${methodology}, scope=${scope}, slug=${slug})`,
      );
    }

    const implRelPath = path
      .relative(ROOT, indexPath)
      .split(path.sep)
      .join('/');

    const contributors = getContributors(libSrcPath);

    // Extract frameworkRules slugs from app-level definition, resolve to full objects
    const appRuleDefPath = path.join(appPath, 'src', 'rule-definition.ts');
    const frSlugs = extractFrameworkRuleSlugs(appRuleDefPath);
    const methodologyFrameworkRules = frameworkRulesMap.get(methodology);
    const resolvedFrameworkRules: FrameworkRule[] = [];

    for (const frSlug of frSlugs) {
      const fr = methodologyFrameworkRules?.get(frSlug);
      if (fr) {
        resolvedFrameworkRules.push(fr);
      }
    }

    const readmePath = path.join(appPath, 'README.md');
    const readme = generateReadme({
      codecovFlag: getCodecovFlag(scope, slug),
      contributors,
      description: ruleDef.description,
      events: ruleDef.events,
      frameworkRules: resolvedFrameworkRules,
      implRelPath,
      methodology,
      name: ruleDef.name,
    });

    fs.writeFileSync(readmePath, readme, 'utf8');
    readmePaths.push(readmePath);
    updated++;
  }

  if (readmePaths.length > 0) {
    console.log(`Formatting ${readmePaths.length} README files with prettier...`);
    execFileSync('npx', ['prettier', '--write', ...readmePaths], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'inherit',
    });
  }

  console.log(`Generated ${updated} README files (skipped ${skipped})`);

  generateCodecovYaml();
  console.log('Generated codecov.yml');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
