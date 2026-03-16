#!/usr/bin/env tsx

/**
 * Generates README.md files for each rule from rule-definition.ts data
 * and git contributor information.
 *
 * Usage: npx tsx scripts/generate-rule-readmes.ts
 */

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

// Same mappings as manifest generation
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

interface RuleDefinitionData {
  description: string;
  name: string;
  slug: string;
}

function dirExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function getLibSrcPath(scope: string, slug: string): string {
  const libScope = SCOPE_TO_LIB[scope] ?? scope;
  const libSlug = SLUG_TO_LIB[slug] ?? slug;
  return path.join(LIB_RULE_PROCESSORS, libScope, libSlug, 'src');
}

function extractRuleDefinition(
  srcPath: string,
  slug: string,
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

  return {
    description: descMatch?.[1]?.trim() ?? '',
    name: nameMatch?.[1] ?? libSlug,
    slug: slugMatch?.[1] ?? libSlug,
  };
}


function generateReadme(
  name: string,
  methodology: string,
  description: string,
  libSrcPath: string,
  existingReadme: string | undefined,
): string {
  const methodologyUpper = methodology.toUpperCase();
  const implRelPath = path
    .relative(ROOT, path.join(libSrcPath, 'index.ts'))
    .split(path.sep)
    .join('/');

  // Preserve existing contributor section if present
  let contributorSection = '_No contributors found_';
  if (existingReadme) {
    const contribMatch = existingReadme.match(
      /## 👥 Contributors\n\n([\s\S]*?)(?=\n## )/,
    );
    if (contribMatch?.[1]?.trim()) {
      contributorSection = contribMatch[1].trim();
    }
  }

  return `<div align="center">

# ${name}

Methodology: **${methodologyUpper}**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/smaug/actions)

</div>

## 📄 Description

${description}

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

function main(): void {
  const rules = discoverRules();
  let updated = 0;
  let skipped = 0;

  for (const { appPath, methodology, scope, slug } of rules) {
    const libSrcPath = getLibSrcPath(scope, slug);
    const ruleDef = extractRuleDefinition(libSrcPath, slug);

    if (!ruleDef) {
      console.log(`  Skipping ${methodology}/${scope}/${slug}: no rule definition`);
      skipped++;
      continue;
    }

    const readmePath = path.join(appPath, 'README.md');
    const existingReadme = fs.existsSync(readmePath)
      ? fs.readFileSync(readmePath, 'utf8')
      : undefined;
    const readme = generateReadme(
      ruleDef.name,
      methodology,
      ruleDef.description,
      libSrcPath,
      existingReadme,
    );

    fs.writeFileSync(readmePath, readme, 'utf8');
    updated++;
  }

  console.log(`Generated ${updated} README files (skipped ${skipped})`);
}

main();
