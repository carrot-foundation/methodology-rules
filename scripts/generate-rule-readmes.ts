#!/usr/bin/env tsx

/**
 * Generates README.md files for each rule from rule-definition.ts data
 * and git contributor information.
 *
 * Usage: pnpm generate:readmes
 */

import type { BaseRuleDefinition } from '@carrot-fndn/shared/rule/types';

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

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

const BaseRuleDefinitionSchema = z.object({
  description: z.string().nonempty(),
  events: z.array(z.string()),
  name: z.string().nonempty(),
  slug: z.string(),
});

const FrameworkRuleSchema = z.object({
  description: z.string(),
  name: z.string(),
  slug: z.string(),
});

type FrameworkRule = z.infer<typeof FrameworkRuleSchema>;

class ValidationError extends Error {
  override readonly name = 'ValidationError';
}

interface ReadmeInput {
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
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function getLibSrcPath(scope: string, slug: string): string {
  const libScope = SCOPE_TO_LIB[scope] ?? scope;
  const libSlug = SLUG_TO_LIB[slug] ?? slug;
  return path.join(LIB_RULE_PROCESSORS, libScope, libSlug, 'src');
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function importRuleDefinition(
  filePath: string,
): Promise<BaseRuleDefinition | undefined> {
  let mod: Record<string, unknown>;
  try {
    mod = await import(pathToFileURL(filePath).href);
  } catch (error) {
    throw new Error(`Failed to import rule definition from ${filePath}`, {
      cause: error,
    });
  }

  const raw =
    mod.ruleDefinition ??
    (mod.default as Record<string, unknown> | undefined)?.ruleDefinition;

  if (!raw) {
    console.warn(
      `Warning: ${filePath} exists but has no "ruleDefinition" export. ` +
        `Available exports: ${Object.keys(mod).join(', ')}`,
    );
    return undefined;
  }

  const result = BaseRuleDefinitionSchema.safeParse(raw);

  if (!result.success) {
    throw new ValidationError(
      `Invalid rule definition in ${filePath}: ${result.error.message}`,
      { cause: result.error },
    );
  }

  return result.data;
}

async function extractRuleDefinition(
  srcPath: string,
  slug: string,
): Promise<BaseRuleDefinition | undefined> {
  const files = dirExists(srcPath) ? fs.readdirSync(srcPath) : [];
  const ruleDefFile = files.find((f) => f.endsWith('.rule-definition.ts'));

  if (!ruleDefFile) return undefined;

  const def = await importRuleDefinition(path.join(srcPath, ruleDefFile));

  if (!def) return undefined;

  // When the app slug differs from the lib slug (SLUG_TO_LIB mapping),
  // derive the name from the app slug instead of using the shared lib's name
  const hasSlugMapping = SLUG_TO_LIB[slug] !== undefined;
  const name = hasSlugMapping ? slugToTitle(slug) : def.name;

  return { ...def, name };
}

/**
 * Extracts frameworkRules slugs from the app-level rule-definition.ts via regex.
 * Dynamic import is not used here because the app-level file imports
 * baseRuleDefinition from the lib barrel (e.g., .../weighing/src/index.ts),
 * which also re-exports the lambda handler. That handler calls
 * wrapRuleIntoLambdaHandler at module scope, which reads process.env.
 */
function extractFrameworkRuleSlugs(appRuleDefPath: string): string[] {
  if (!fileExists(appRuleDefPath)) return [];

  let content: string;
  try {
    content = fs.readFileSync(appRuleDefPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read app rule definition: ${appRuleDefPath}`, {
      cause: error,
    });
  }
  const match = content.match(/frameworkRules:\s*\[([\s\S]*?)\]/);
  if (!match?.[1]) return [];

  const results: string[] = [];
  const re = /['"`]([^'"`]+)['"`]/g;

  while (true) {
    const r = re.exec(match[1]);
    if (!r) break;
    if (r[1] !== undefined) results.push(r[1]);
  }

  return results;
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
    console.log(`  No framework rules file for ${methodology}: ${filePath}`);
    return new Map();
  }
  let mod: Record<string, unknown>;
  try {
    mod = await import(pathToFileURL(filePath).href);
  } catch (error) {
    throw new Error(`Failed to load framework rules from ${filePath}`, {
      cause: error,
    });
  }

  const raw: unknown =
    mod.frameworkRules ??
    (mod.default as Record<string, unknown> | undefined)?.frameworkRules ??
    mod.default;

  const result = z.array(FrameworkRuleSchema).safeParse(raw);

  if (!result.success) {
    throw new ValidationError(
      `Invalid framework rules in ${filePath}: expected an array of {slug, name, description}. ` +
        `Available exports: ${Object.keys(mod).join(', ')}`,
      { cause: result.error },
    );
  }

  const map = new Map<string, FrameworkRule>();
  for (const rule of result.data) {
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
    const exitCode = (error as { status?: number }).status;
    const signal = (error as { signal?: string }).signal;
    const message = error instanceof Error ? error.message : String(error);

    // Exit code 128 = git fatal error (e.g., not a git repo, git not found, corrupt repo) — systemic, not per-directory
    if (exitCode === 128 || message.includes('not a git repository')) {
      throw new Error(
        `Git operation failed for ${dirPath}. Is this a git repository? ${message}`,
      );
    }

    // Signal-killed processes indicate systemic issues, not per-directory problems
    if (signal) {
      throw new Error(
        `Git process was killed by signal ${signal} for ${dirPath}: ${message}`,
      );
    }

    console.warn(
      `Warning: failed to extract contributors for ${dirPath} (exit code ${exitCode}): ${message}`,
    );
    return [];
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
[![Codecov](https://img.shields.io/codecov/c/github/carrot-foundation/methodology-rules)](https://codecov.io/gh/carrot-foundation/methodology-rules)
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

  if (!dirExists(APPS_METHODOLOGIES)) {
    throw new Error(
      `Methodologies directory not found: ${APPS_METHODOLOGIES}. ` +
        `Ensure the script is run from the repository root.`,
    );
  }

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
        const appPath = path.join(rulesDir, slug);

        // Skip legacy stub directories that have no src/ (no deployable rule)
        if (!dirExists(path.join(appPath, 'src'))) continue;

        rules.push({ appPath, methodology, scope, slug });
      }
    }
  }

  return rules;
}

async function main(): Promise<void> {
  const rules = discoverRules();

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
    const ruleDef = await extractRuleDefinition(libSrcPath, slug);

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
      } else {
        console.warn(
          `Warning: framework rule slug "${frSlug}" not found in ${methodology} ` +
            `(referenced by ${appRuleDefPath})`,
        );
      }
    }

    const readmePath = path.join(appPath, 'README.md');
    const readme = generateReadme({
      contributors,
      description: ruleDef.description,
      events: ruleDef.events,
      frameworkRules: resolvedFrameworkRules,
      implRelPath,
      methodology,
      name: ruleDef.name,
    });

    try {
      fs.writeFileSync(readmePath, readme, 'utf8');
    } catch (error) {
      throw new Error(
        `Failed to write README for ${methodology}/${scope}/${slug} at ${readmePath}`,
        { cause: error },
      );
    }
    readmePaths.push(readmePath);
    updated++;
  }

  if (readmePaths.length > 0) {
    console.log(`Formatting ${readmePaths.length} README files with prettier...`);
    try {
      execFileSync('pnpm', ['exec', 'prettier', '--write', ...readmePaths], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'ignore', 'inherit'],
      });
    } catch (error) {
      throw new Error(
        `Prettier formatting failed for ${readmePaths.length} README files`,
        { cause: error },
      );
    }
  }

  console.log(`Generated ${updated} README files (skipped ${skipped})`);
}

try {
  await main();
} catch (error) {
  console.error('README generation failed:', error);
  let current = error;
  while (current instanceof Error && current.cause) {
    console.error('Caused by:', current.cause);
    current = current.cause;
  }
  process.exitCode = 1;
}
