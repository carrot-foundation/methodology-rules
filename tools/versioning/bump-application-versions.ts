#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { z } from 'zod';

import { diffMethodologyFrameworkRules } from './shared/methodology-framework-rules-diff';
import type { ApplicationBump, BumpLevel, RuleBump } from './shared/types';
import { bumpVersion, highestBump } from './shared/version-utils';

const ROOT = path.resolve(__dirname, '../..');
const LIBS_METHODOLOGIES = path.join(ROOT, 'libs', 'methodologies');
const DRY_RUN = process.argv.includes('--dry-run');

interface DiscoveredMethodology {
  configPath: string;
  currentVersion: string;
  frameworkRulesPath: string;
  key: string;
}

interface MethodologyBumpResult {
  applicationBump: ApplicationBump;
  methodology: DiscoveredMethodology;
}

interface AnalysisResult {
  results: MethodologyBumpResult[];
}

function discoverMethodologies(): DiscoveredMethodology[] {
  const methodologies: DiscoveredMethodology[] = [];

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

    if (!fs.existsSync(configPath)) continue;

    const frameworkRulesPath = path.join(
      LIBS_METHODOLOGIES,
      entry.name,
      'rules',
      'src',
      'methodology-framework-rules.ts',
    );

    const content = fs.readFileSync(configPath, 'utf8');
    const versionMatch = /(?<!\w)version:\s*'([^']+)'/.exec(content);

    if (!versionMatch?.[1]) {
      console.warn(`  SKIP ${entry.name}: missing version in config`);
      continue;
    }

    methodologies.push({
      configPath,
      currentVersion: versionMatch[1],
      frameworkRulesPath,
      key: entry.name,
    });
  }

  return methodologies;
}

function getLatestTagForMethodology(
  methodology: string,
): string | undefined {
  const output = execFileSync(
    'git',
    [
      'tag',
      '--list',
      `methodology-application/${methodology}@*`,
      '--sort=-creatordate',
    ],
    { cwd: ROOT, encoding: 'utf8' },
  ).trim();

  const firstTag = output.split('\n')[0];

  return firstTag || undefined;
}

function getFrameworkRuleSlugsAtRef(
  filePath: string,
  ref?: string,
): string[] {
  let content: string;

  if (ref) {
    const relativePath = path.relative(ROOT, filePath);

    try {
      content = execFileSync(
        'git',
        ['show', `${ref}:${relativePath}`],
        { cwd: ROOT, encoding: 'utf8' },
      );
    } catch (error: unknown) {
      // git show exits 128 when path doesn't exist at ref — expected on first run
      const exitCode =
        error instanceof Error && 'status' in error
          ? (error as { status: number }).status
          : undefined;

      if (exitCode === 128) return [];

      throw new Error(
        `Failed to read ${filePath} at ref ${ref}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    if (!fs.existsSync(filePath)) return [];
    content = fs.readFileSync(filePath, 'utf8');
  }

  const slugRegex = /slug:\s*['"`]([^'"`]+)['"`]/g;
  const slugs: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = slugRegex.exec(content)) !== null) {
    if (match[1]) {
      slugs.push(match[1]);
    }
  }

  return slugs;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateConfigVersion(
  configPath: string,
  oldVersion: string,
  newVersion: string,
): void {
  const content = fs.readFileSync(configPath, 'utf8');

  // Match `version: '...'` but NOT `methodologyFrameworkVersion: '...'`
  const regex = new RegExp(
    `((?<!\\w)version:\\s*')${escapeRegex(oldVersion)}(')`
  );

  const updated = content.replace(regex, `$1${newVersion}$2`);

  if (updated === content) {
    throw new Error(
      `Failed to replace version '${oldVersion}' in ${configPath}`,
    );
  }

  fs.writeFileSync(configPath, updated, 'utf8');
}

function getChangelogPath(methodologyKey: string): string {
  return path.join(
    LIBS_METHODOLOGIES,
    methodologyKey,
    'rules',
    'CHANGELOG.md',
  );
}

function appendToChangelog(
  methodologyKey: string,
  version: string,
  applicationBump: ApplicationBump,
): void {
  const changelogPath = getChangelogPath(methodologyKey);

  const date = new Date().toISOString().split('T')[0];
  const sections: string[] = [];

  if (applicationBump.addedRules.length > 0) {
    const lines = applicationBump.addedRules.map((slug) => `- ${slug}`);
    sections.push(`### Added rules\n\n${lines.join('\n')}`);
  }

  if (applicationBump.removedRules.length > 0) {
    const lines = applicationBump.removedRules.map((slug) => `- ${slug}`);
    sections.push(`### Removed rules\n\n${lines.join('\n')}`);
  }

  if (applicationBump.ruleBumps.length > 0) {
    const lines = applicationBump.ruleBumps.map(
      (rb) =>
        `- ${rb.slug}: ${rb.previousVersion} → ${rb.newVersion} (${rb.bumpLevel})`,
    );
    sections.push(`### Rule updates\n\n${lines.join('\n')}`);
  }

  const newEntry =
    sections.length > 0
      ? `## ${version} (${date})\n\n${sections.join('\n\n')}`
      : `## ${version} (${date})\n\nNo notable changes.`;

  if (fs.existsSync(changelogPath)) {
    const existing = fs.readFileSync(changelogPath, 'utf8');
    const headerEnd = existing.indexOf('\n');

    if (headerEnd === -1) {
      fs.writeFileSync(
        changelogPath,
        `${existing}\n\n${newEntry}\n`,
        'utf8',
      );
    } else {
      const header = existing.slice(0, headerEnd);
      const rest = existing.slice(headerEnd);
      fs.writeFileSync(
        changelogPath,
        `${header}\n\n${newEntry}${rest}`,
        'utf8',
      );
    }
  } else {
    fs.writeFileSync(
      changelogPath,
      `# Changelog\n\n${newEntry}\n`,
      'utf8',
    );
  }
}

function commitVersionBump(
  methodology: DiscoveredMethodology,
  newVersion: string,
): void {
  const changelogPath = getChangelogPath(methodology.key);

  execFileSync(
    'git',
    ['add', methodology.configPath, changelogPath],
    { cwd: ROOT, encoding: 'utf8' },
  );
  execFileSync(
    'git',
    ['commit', '-m', `chore(${methodology.key}): bump to ${newVersion}`],
    { cwd: ROOT, encoding: 'utf8' },
  );
}

function createGitTag(methodology: string, version: string): void {
  execFileSync(
    'git',
    ['tag', `methodology-application/${methodology}@${version}`],
    { cwd: ROOT, encoding: 'utf8' },
  );
}

const RuleBumpSchema = z.object({
  bumpLevel: z.enum(['major', 'minor', 'patch']),
  commits: z.array(z.string()),
  newVersion: z.string(),
  previousVersion: z.string(),
  slug: z.string(),
});

function loadRuleBumps(): RuleBump[] {
  const ruleBumpsPath = path.join(ROOT, 'dist', 'rule-bumps.json');

  if (!fs.existsSync(ruleBumpsPath)) {
    throw new Error(
      `Required artifact not found: ${ruleBumpsPath}. ` +
        'Run bump:rules before bump:applications.',
    );
  }

  const content = fs.readFileSync(ruleBumpsPath, 'utf8');
  const parsed: unknown = JSON.parse(content);
  const result = z.array(RuleBumpSchema).safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Invalid rule-bumps.json format: ${result.error.message}`,
    );
  }

  return result.data;
}

function analyzeMethodologyBumps(ruleBumps: RuleBump[]): AnalysisResult {
  const methodologies = discoverMethodologies();
  console.log(
    `Discovered ${String(methodologies.length)} methodology application(s): ${methodologies.map((m) => m.key).join(', ')}`,
  );

  const results: MethodologyBumpResult[] = [];

  for (const methodology of methodologies) {
    console.log(`\nProcessing ${methodology.key}...`);

    const latestTag = getLatestTagForMethodology(methodology.key);
    console.log(
      latestTag
        ? `  Latest tag: ${latestTag}`
        : '  No previous tag found',
    );

    const currentSlugs = getFrameworkRuleSlugsAtRef(
      methodology.frameworkRulesPath,
    );

    // When no tag exists there is no baseline to diff against,
    // so treat framework rules as unchanged to avoid false "added" bumps.
    const { added, removed } = latestTag
      ? diffMethodologyFrameworkRules(
          getFrameworkRuleSlugsAtRef(
            methodology.frameworkRulesPath,
            latestTag,
          ),
          currentSlugs,
        )
      : { added: [] as string[], removed: [] as string[] };

    console.log(
      `  Framework rules: ${String(currentSlugs.length)} at HEAD`,
    );

    if (added.length > 0) {
      console.log(`  Added rules: ${added.join(', ')}`);
    }

    if (removed.length > 0) {
      console.log(`  Removed rules: ${removed.join(', ')}`);
    }

    // Collect rule bumps that belong to this methodology
    const currentSlugSet = new Set(currentSlugs);
    const matchingRuleBumps = ruleBumps.filter((rb) =>
      currentSlugSet.has(rb.slug),
    );

    if (matchingRuleBumps.length > 0) {
      console.log(
        `  Matching rule bumps: ${matchingRuleBumps.map((rb) => `${rb.slug} (${rb.bumpLevel})`).join(', ')}`,
      );
    }

    // Determine rollup bump level
    const bumpLevels: BumpLevel[] = [];

    if (removed.length > 0) {
      bumpLevels.push('major');
    }

    if (added.length > 0) {
      bumpLevels.push('minor');
    }

    for (const rb of matchingRuleBumps) {
      bumpLevels.push(rb.bumpLevel);
    }

    const rollupLevel = highestBump(bumpLevels);

    if (!rollupLevel) {
      console.log('  No changes detected, skipping.');
      continue;
    }

    const newVersion = bumpVersion(methodology.currentVersion, rollupLevel);
    console.log(
      `  Bump: ${methodology.currentVersion} -> ${newVersion} (${rollupLevel})`,
    );

    results.push({
      applicationBump: {
        addedRules: added,
        bumpLevel: rollupLevel,
        methodology: methodology.key,
        newVersion,
        previousVersion: methodology.currentVersion,
        removedRules: removed,
        ruleBumps: matchingRuleBumps,
      },
      methodology,
    });
  }

  return { results };
}

function persistMethodologyBumps(
  results: MethodologyBumpResult[],
): void {
  for (const { methodology, applicationBump } of results) {
    updateConfigVersion(
      methodology.configPath,
      methodology.currentVersion,
      applicationBump.newVersion,
    );
    console.log(`  Updated ${methodology.configPath}`);

    appendToChangelog(
      methodology.key,
      applicationBump.newVersion,
      applicationBump,
    );
    console.log(`  Updated CHANGELOG.md`);

    commitVersionBump(methodology, applicationBump.newVersion);
    console.log(
      `  Committed version bump for ${methodology.key}@${applicationBump.newVersion}`,
    );

    createGitTag(methodology.key, applicationBump.newVersion);
    console.log(
      `  Created tag: methodology-application/${methodology.key}@${applicationBump.newVersion}`,
    );
  }

  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const applicationBumps = results.map((r) => r.applicationBump);
  const outputPath = path.join(distDir, 'application-bumps.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(applicationBumps, null, 2),
    'utf8',
  );
  console.log(
    `\nWrote ${String(applicationBumps.length)} bump(s) to ${outputPath}`,
  );
}

function removeStaleOutputFile(): void {
  const outputPath = path.join(ROOT, 'dist', 'application-bumps.json');

  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`Removed stale ${outputPath}`);
  }
}

function main(): void {
  console.log(
    DRY_RUN
      ? '=== DRY RUN (no files will be changed) ==='
      : '=== Bumping application versions ===',
  );

  const ruleBumps = loadRuleBumps();
  console.log(`Loaded ${String(ruleBumps.length)} rule bump(s)`);

  const { results } = analyzeMethodologyBumps(ruleBumps);

  if (results.length === 0) {
    console.log('\nNo application bumps to apply.');
    removeStaleOutputFile();

    return;
  }

  if (DRY_RUN) {
    for (const { methodology, applicationBump } of results) {
      console.log(
        `\n  ${methodology.key}: ${applicationBump.previousVersion} -> ${applicationBump.newVersion} (${applicationBump.bumpLevel})`,
      );
      console.log(`  Would update ${methodology.configPath}`);
      console.log(`  Would update CHANGELOG.md`);
      console.log(
        `  Would create tag: methodology-application/${methodology.key}@${applicationBump.newVersion}`,
      );
    }

    console.log(
      `\nWould write ${String(results.length)} bump(s) to dist/application-bumps.json`,
    );
    console.log(
      JSON.stringify(
        results.map((r) => r.applicationBump),
        null,
        2,
      ),
    );

    return;
  }

  persistMethodologyBumps(results);
}

main();
