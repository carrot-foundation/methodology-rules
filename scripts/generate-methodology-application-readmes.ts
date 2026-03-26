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

interface RuleProcessorInfo {
  directoryPath: string;
  name: string;
  slug: string;
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

function readRulesConfig(configPath: string): Map<string, string[]> {
  const map = new Map<string, string[]>();

  if (!fileExists(configPath)) return map;

  const content = fs.readFileSync(configPath, 'utf8');
  const scopeRegex = /'([^']+)':\s*\[([\s\S]*?)\]/g;

  let match: RegExpExecArray | null;

  while ((match = scopeRegex.exec(content)) !== null) {
    const scope = match[1];
    const slugsContent = match[2];

    if (!scope || !slugsContent) continue;

    const slugs: string[] = [];
    const slugRegex = /'([^']+)'/g;

    let slugMatch: RegExpExecArray | null;

    while ((slugMatch = slugRegex.exec(slugsContent)) !== null) {
      if (slugMatch[1]) {
        slugs.push(slugMatch[1]);
      }
    }

    if (slugs.length > 0) {
      map.set(scope, slugs);
    }
  }

  return map;
}

function buildRuleProcessorIndex(): {
  byDirSlug: Map<string, RuleProcessorInfo>;
  byScopedDirSlug: Map<string, RuleProcessorInfo>;
} {
  const byDirSlug = new Map<string, RuleProcessorInfo>();
  const byScopedDirSlug = new Map<string, RuleProcessorInfo>();

  if (!dirExists(LIB_RULE_PROCESSORS)) {
    return { byDirSlug, byScopedDirSlug };
  }

  const scopes = fs
    .readdirSync(LIB_RULE_PROCESSORS)
    .filter((d) => dirExists(path.join(LIB_RULE_PROCESSORS, d)));

  for (const scope of scopes) {
    const scopeDir = path.join(LIB_RULE_PROCESSORS, scope);
    const dirs = fs
      .readdirSync(scopeDir)
      .filter((d) => dirExists(path.join(scopeDir, d)));

    for (const dirName of dirs) {
      const ruleDir = path.join(scopeDir, dirName);
      const srcDir = path.join(ruleDir, 'src');

      if (!dirExists(srcDir)) continue;

      const files = fs.readdirSync(srcDir);
      const ruleDefFile = files.find((f) => f.endsWith('.rule-definition.ts'));

      if (!ruleDefFile) continue;

      const content = fs.readFileSync(path.join(srcDir, ruleDefFile), 'utf8');

      const nameMatch = /name:\s*'([^']+)'/.exec(content);
      const versionMatch = /(?<!\w)version:\s*'([^']+)'/.exec(content);
      const slugMatch = /slug:\s*'([^']+)'/.exec(content);

      const info: RuleProcessorInfo = {
        directoryPath: ruleDir,
        name: nameMatch?.[1] ?? dirName,
        slug: slugMatch?.[1] ?? dirName,
        version: versionMatch?.[1] ?? '-',
      };

      byDirSlug.set(dirName, info);
      byScopedDirSlug.set(`${scope}/${dirName}`, info);
    }
  }

  return { byDirSlug, byScopedDirSlug };
}

function resolveProcessor(
  configScope: string,
  configSlug: string,
  index: {
    byDirSlug: Map<string, RuleProcessorInfo>;
    byScopedDirSlug: Map<string, RuleProcessorInfo>;
  },
): RuleProcessorInfo | undefined {
  return (
    index.byScopedDirSlug.get(`${configScope}/${configSlug}`) ??
    index.byDirSlug.get(configSlug)
  );
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateReadme(
  config: MethodologyConfig,
  rulesConfig: Map<string, string[]>,
  processorIndex: {
    byDirSlug: Map<string, RuleProcessorInfo>;
    byScopedDirSlug: Map<string, RuleProcessorInfo>;
  },
  readmeDir: string,
): string {
  const scopeSections: string[] = [];

  for (const [scope, slugs] of rulesConfig) {
    const rows = slugs.map((slug, index) => {
      const processor = resolveProcessor(scope, slug, processorIndex);

      if (processor) {
        const relativePath = path.relative(readmeDir, processor.directoryPath);
        const nameLink = `[${processor.name}](${relativePath})`;

        return `| ${String(index + 1)} | ${nameLink} | ${processor.version} |`;
      }

      return `| ${String(index + 1)} | ${slugToTitle(slug)} | - |`;
    });

    scopeSections.push(
      `### ${scope}\n\n| # | Name | Version |\n|---|------|---------|` +
        `\n${rows.join('\n')}`,
    );
  }

  const rulesSection =
    scopeSections.length > 0
      ? `## Rules\n\n${scopeSections.join('\n\n')}\n`
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
  key: string;
  readmePath: string;
  rulesConfigPath: string;
}> {
  const methodologies: Array<{
    configPath: string;
    key: string;
    readmePath: string;
    rulesConfigPath: string;
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
      key: entry.name,
      readmePath: path.join(
        LIBS_METHODOLOGIES,
        entry.name,
        'rules',
        'README.md',
      ),
      rulesConfigPath: path.join(
        LIBS_METHODOLOGIES,
        entry.name,
        'rules',
        'src',
        'rules.config.ts',
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

  const processorIndex = buildRuleProcessorIndex();
  console.log(
    `Loaded ${String(processorIndex.byDirSlug.size)} rule processor(s) with version info`,
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

    const rulesConfig = readRulesConfig(methodology.rulesConfigPath);
    const ruleCount = [...rulesConfig.values()].reduce(
      (sum, slugs) => sum + slugs.length,
      0,
    );

    console.log(
      `  ${methodology.key}: ${config.displayName} v${config.version} (MvF v${config.methodologyFrameworkVersion}), ${String(ruleCount)} rule(s) in ${String(rulesConfig.size)} scope(s)`,
    );

    const readmeDir = path.dirname(methodology.readmePath);
    const readme = generateReadme(
      config,
      rulesConfig,
      processorIndex,
      readmeDir,
    );

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
