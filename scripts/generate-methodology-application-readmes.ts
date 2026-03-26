#!/usr/bin/env tsx

/**
 * Generates README.md files for each methodology application
 * (bold-carbon, bold-recycling, etc.) by reading the methodology-application
 * config, the framework rules list, and the rule-processor definitions.
 *
 * Usage: pnpm generate:methodology-readmes
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const LIBS_METHODOLOGIES = path.join(ROOT, 'libs', 'methodologies');
const LIB_RULE_PROCESSORS = path.join(
  LIBS_METHODOLOGIES,
  'bold',
  'rule-processors',
);

interface MethodologyConfig {
  displayName: string;
  methodologyFrameworkVersion: string;
  version: string;
}

interface FrameworkRule {
  name: string;
  slug: string;
}

interface RuleVersion {
  name: string;
  version: string;
}

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function dirExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function readConfig(configPath: string): MethodologyConfig | undefined {
  if (!fileExists(configPath)) return undefined;

  const content = fs.readFileSync(configPath, 'utf8');

  const displayNameMatch = /displayName:\s*'([^']+)'/.exec(content);
  const versionMatch = /(?<!\w)version:\s*'([^']+)'/.exec(content);
  const frameworkVersionMatch =
    /methodologyFrameworkVersion:\s*'([^']+)'/.exec(content);

  if (!displayNameMatch?.[1] || !versionMatch?.[1] || !frameworkVersionMatch?.[1]) {
    return undefined;
  }

  return {
    displayName: displayNameMatch[1],
    methodologyFrameworkVersion: frameworkVersionMatch[1],
    version: versionMatch[1],
  };
}

function readFrameworkRules(rulesPath: string): FrameworkRule[] {
  if (!fileExists(rulesPath)) return [];

  const content = fs.readFileSync(rulesPath, 'utf8');
  const rules: FrameworkRule[] = [];

  // Match each object block with name and slug fields
  const blockRegex = /\{[^}]*?name:\s*'([^']+)'[^}]*?slug:\s*'([^']+)'[^}]*?\}/gs;

  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    if (match[1] && match[2]) {
      rules.push({ name: match[1], slug: match[2] });
    }
  }

  return rules;
}

function buildRuleVersionMap(): Map<string, RuleVersion> {
  const map = new Map<string, RuleVersion>();

  if (!dirExists(LIB_RULE_PROCESSORS)) return map;

  const scopes = fs
    .readdirSync(LIB_RULE_PROCESSORS)
    .filter((d) => dirExists(path.join(LIB_RULE_PROCESSORS, d)));

  for (const scope of scopes) {
    const scopeDir = path.join(LIB_RULE_PROCESSORS, scope);
    const slugs = fs
      .readdirSync(scopeDir)
      .filter((d) => dirExists(path.join(scopeDir, d)));

    for (const slug of slugs) {
      const srcDir = path.join(scopeDir, slug, 'src');
      if (!dirExists(srcDir)) continue;

      const files = fs.readdirSync(srcDir);
      const ruleDefFile = files.find((f) => f.endsWith('.rule-definition.ts'));

      if (!ruleDefFile) continue;

      const content = fs.readFileSync(path.join(srcDir, ruleDefFile), 'utf8');

      const nameMatch = /name:\s*'([^']+)'/.exec(content);
      const versionMatch = /version:\s*'([^']+)'/.exec(content);
      const slugMatch = /slug:\s*'([^']+)'/.exec(content);

      const ruleSlug = slugMatch?.[1] ?? slug;

      if (nameMatch?.[1] && versionMatch?.[1]) {
        map.set(ruleSlug, {
          name: nameMatch[1],
          version: versionMatch[1],
        });
      }
    }
  }

  return map;
}

function generateReadme(
  config: MethodologyConfig,
  frameworkRules: FrameworkRule[],
  ruleVersionMap: Map<string, RuleVersion>,
): string {
  const rows = frameworkRules
    .map((rule, index) => {
      const ruleVersion = ruleVersionMap.get(rule.slug);
      const version = ruleVersion?.version ?? '-';

      return `| ${String(index + 1)} | ${rule.name} | \`${rule.slug}\` | ${version} |`;
    })
    .join('\n');

  const rulesSection =
    frameworkRules.length > 0
      ? `## Rules

| # | Name | Slug | Version |
|---|------|------|---------|
${rows}
`
      : '';

  return `# ${config.displayName}

> Methodology Verification Application

[![MvA: v${config.version}](https://img.shields.io/badge/MvA-v${config.version}-blue)](./CHANGELOG.md)
[![MvF: v${config.methodologyFrameworkVersion}](https://img.shields.io/badge/MvF-v${config.methodologyFrameworkVersion}-green)](./CHANGELOG.md)

**[Changelog](./CHANGELOG.md)**

${rulesSection}
## License

LGPL-3.0
`;
}

function discoverMethodologies(): Array<{
  configPath: string;
  frameworkRulesPath: string;
  key: string;
  readmePath: string;
}> {
  const methodologies: Array<{
    configPath: string;
    frameworkRulesPath: string;
    key: string;
    readmePath: string;
  }> = [];

  if (!dirExists(LIBS_METHODOLOGIES)) {
    throw new Error(
      `Methodologies directory not found: ${LIBS_METHODOLOGIES}. ` +
        `Ensure the script is run from the repository root.`,
    );
  }

  const entries = fs
    .readdirSync(LIBS_METHODOLOGIES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  for (const entry of entries) {
    const configPath = path.join(
      LIBS_METHODOLOGIES,
      entry.name,
      'rules',
      'src',
      'methodology-application.config.ts',
    );

    if (!fileExists(configPath)) continue;

    methodologies.push({
      configPath,
      frameworkRulesPath: path.join(
        LIBS_METHODOLOGIES,
        entry.name,
        'rules',
        'src',
        'methodology-framework-rules.ts',
      ),
      key: entry.name,
      readmePath: path.join(
        LIBS_METHODOLOGIES,
        entry.name,
        'rules',
        'README.md',
      ),
    });
  }

  return methodologies;
}

function main(): void {
  const methodologies = discoverMethodologies();

  if (methodologies.length === 0) {
    console.log('No methodology applications found.');
    return;
  }

  console.log(
    `Discovered ${String(methodologies.length)} methodology application(s): ${methodologies.map((m) => m.key).join(', ')}`,
  );

  const ruleVersionMap = buildRuleVersionMap();
  console.log(
    `Loaded ${String(ruleVersionMap.size)} rule definition(s) with version info`,
  );

  const readmePaths: string[] = [];

  for (const methodology of methodologies) {
    const config = readConfig(methodology.configPath);

    if (!config) {
      console.warn(
        `  SKIP ${methodology.key}: could not parse methodology-application.config.ts`,
      );
      continue;
    }

    const frameworkRules = readFrameworkRules(methodology.frameworkRulesPath);
    console.log(
      `  ${methodology.key}: ${config.displayName} v${config.version} (MvF v${config.methodologyFrameworkVersion}), ${String(frameworkRules.length)} framework rules`,
    );

    const readme = generateReadme(config, frameworkRules, ruleVersionMap);

    try {
      fs.writeFileSync(methodology.readmePath, readme, 'utf8');
    } catch (error) {
      throw new Error(
        `Failed to write README for ${methodology.key} at ${methodology.readmePath}`,
        { cause: error },
      );
    }

    readmePaths.push(methodology.readmePath);
  }

  if (readmePaths.length > 0) {
    console.log(
      `Formatting ${String(readmePaths.length)} README file(s) with prettier...`,
    );

    try {
      execFileSync('pnpm', ['exec', 'prettier', '--write', ...readmePaths], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'ignore', 'inherit'],
      });
    } catch (error) {
      throw new Error(
        `Prettier formatting failed for ${String(readmePaths.length)} README file(s)`,
        { cause: error },
      );
    }
  }

  console.log(`Generated ${String(readmePaths.length)} methodology application README(s)`);
}

main();
