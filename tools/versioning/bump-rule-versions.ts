#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseCommitsForRules } from './shared/commit-parser';
import type { RuleBump } from './shared/types';
import { bumpVersion } from './shared/version-utils';

const ROOT = path.resolve(__dirname, '../..');
const LIB_RULE_PROCESSORS = path.join(
  ROOT,
  'libs',
  'methodologies',
  'bold',
  'rule-processors',
);
const DRY_RUN = process.argv.includes('--dry-run');

interface DiscoveredRule {
  filePath: string;
  ruleDir: string;
  slug: string;
  version: string;
}

function getLatestMvaTag(): string | undefined {
  try {
    const tag = execFileSync(
      'git',
      ['describe', '--tags', '--match', 'methodology-application/*', '--abbrev=0'],
      { cwd: ROOT, encoding: 'utf8' },
    ).trim();

    return tag || undefined;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      /No names found|cannot describe/i.test(error.message)
    ) {
      return undefined;
    }

    throw error;
  }
}

function getCommitsSince(ref?: string): string[] {
  const args = ref
    ? ['log', `${ref}..HEAD`, '--format=%s']
    : ['log', '--format=%s'];

  const output = execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();

  if (!output) return [];

  return output.split('\n');
}

function collectCommitsPerSlug(
  commitMessages: string[],
): Map<string, string[]> {
  const commitsPerSlug = new Map<string, string[]>();
  const scopeRegex = /^\w+\(([^)]+)\)!?:/;

  for (const message of commitMessages) {
    const match = scopeRegex.exec(message);
    if (!match?.[1]) continue;

    const scope = match[1];
    const existing = commitsPerSlug.get(scope) ?? [];
    existing.push(message);
    commitsPerSlug.set(scope, existing);
  }

  return commitsPerSlug;
}

function discoverRuleDefinitions(): DiscoveredRule[] {
  const rules: DiscoveredRule[] = [];
  const slugRegex = /slug:\s*'([^']+)'/;
  const versionRegex = /version:\s*'([^']+)'/;
  const slugLocations = new Map<string, string>();

  const scopes = fs
    .readdirSync(LIB_RULE_PROCESSORS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const scope of scopes) {
    const scopeDir = path.join(LIB_RULE_PROCESSORS, scope);
    const ruleDirs = fs
      .readdirSync(scopeDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const ruleDir of ruleDirs) {
      const srcDir = path.join(scopeDir, ruleDir, 'src');
      if (!fs.existsSync(srcDir)) continue;

      const files = fs.readdirSync(srcDir);
      const defFile = files.find((f) => f.endsWith('.rule-definition.ts'));
      if (!defFile) continue;

      const filePath = path.join(srcDir, defFile);
      const content = fs.readFileSync(filePath, 'utf8');

      const slugMatch = slugRegex.exec(content);
      const versionMatch = versionRegex.exec(content);

      if (!slugMatch?.[1] || !versionMatch?.[1]) {
        console.warn(`  SKIP ${filePath}: missing slug or version`);
        continue;
      }

      const slug = slugMatch[1];
      const previousLocation = slugLocations.get(slug);

      if (previousLocation) {
        throw new Error(
          `Duplicate slug "${slug}" found in ${filePath} and ${previousLocation}. ` +
            'Slugs must be unique across all processor scopes.',
        );
      }

      slugLocations.set(slug, filePath);

      rules.push({
        filePath,
        ruleDir: path.join(scopeDir, ruleDir),
        slug,
        version: versionMatch[1],
      });
    }
  }

  return rules;
}

function updateRuleDefinitionVersion(
  filePath: string,
  oldVersion: string,
  newVersion: string,
): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(
    `version: '${oldVersion}'`,
    `version: '${newVersion}'`,
  );

  if (updated === content) {
    throw new Error(
      `Failed to replace version '${oldVersion}' in ${filePath}`,
    );
  }

  fs.writeFileSync(filePath, updated, 'utf8');
}

function appendToChangelog(
  ruleDir: string,
  version: string,
  commits: string[],
): void {
  const changelogPath = path.join(ruleDir, 'CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0];
  const commitLines = commits.map((c) => `- ${c}`).join('\n');
  const newEntry = `## ${version} (${date})\n\n${commitLines}`;

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

function main(): void {
  console.log(
    DRY_RUN ? '=== DRY RUN (no files will be changed) ===' : '=== Bumping rule versions ===',
  );

  const tag = getLatestMvaTag();
  console.log(tag ? `Latest MvA tag: ${tag}` : 'No MvA tags found, scanning all commits');

  const commitMessages = getCommitsSince(tag);
  console.log(`Found ${String(commitMessages.length)} commits to analyze`);

  if (commitMessages.length === 0) {
    console.log('No commits to process. Exiting.');

    if (!DRY_RUN) {
      const distDir = path.join(ROOT, 'dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      const outputPath = path.join(distDir, 'rule-bumps.json');
      fs.writeFileSync(outputPath, JSON.stringify([], null, 2), 'utf8');
      console.log(`Wrote empty rule-bumps.json to ${outputPath}`);
    }

    return;
  }

  const ruleBumpsMap = parseCommitsForRules(commitMessages);
  console.log(`Detected bumps for ${String(ruleBumpsMap.size)} rule(s)`);

  const commitsPerSlug = collectCommitsPerSlug(commitMessages);
  const discoveredRules = discoverRuleDefinitions();
  console.log(`Discovered ${String(discoveredRules.length)} rule definitions`);

  const rulesBySlug = new Map<string, DiscoveredRule[]>();
  for (const rule of discoveredRules) {
    const existing = rulesBySlug.get(rule.slug) ?? [];
    existing.push(rule);
    rulesBySlug.set(rule.slug, existing);
  }

  const results: RuleBump[] = [];

  for (const [slug, bumpLevel] of ruleBumpsMap) {
    const rules = rulesBySlug.get(slug);
    if (!rules?.length) {
      console.log(`  SKIP ${slug}: no matching rule-definition.ts found`);
      continue;
    }

    const ruleCommits = commitsPerSlug.get(slug) ?? [];

    for (const rule of rules) {
      const newVersion = bumpVersion(rule.version, bumpLevel);
      const scope = path.basename(path.dirname(rule.ruleDir));

      console.log(`  ${scope}/${slug}: ${rule.version} -> ${newVersion} (${bumpLevel})`);

      if (!DRY_RUN) {
        updateRuleDefinitionVersion(rule.filePath, rule.version, newVersion);
        appendToChangelog(rule.ruleDir, newVersion, ruleCommits);
      }

      results.push({
        bumpLevel,
        commits: ruleCommits,
        newVersion,
        previousVersion: rule.version,
        slug,
      });
    }
  }

  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const outputPath = path.join(distDir, 'rule-bumps.json');

  if (results.length === 0) {
    console.log('No rule bumps to apply.');

    if (!DRY_RUN) {
      fs.writeFileSync(outputPath, JSON.stringify([], null, 2), 'utf8');
      console.log(`Wrote empty rule-bumps.json to ${outputPath}`);
    }

    return;
  }
  if (!DRY_RUN) {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\nWrote ${String(results.length)} bump(s) to ${outputPath}`);
  } else {
    console.log(`\nWould write ${String(results.length)} bump(s) to ${outputPath}`);
    console.log(JSON.stringify(results, null, 2));
  }
}

main();
