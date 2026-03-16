#!/usr/bin/env tsx

/**
 * Generates application-rules-manifest.json — the cross-repo contract
 * between methodology-rules and carrot-docs.
 *
 * Usage: npx tsx scripts/generate-application-rules-manifest.ts
 * Output: dist/application-rules-manifest.json
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const LIB_RULE_PROCESSORS = path.join(
  ROOT,
  'libs',
  'methodologies',
  'bold',
  'rule-processors',
);
const APPS_METHODOLOGIES = path.join(ROOT, 'apps', 'methodologies');

// --- Methodology configs ---

interface RulesConfig {
  [scope: string]: readonly string[];
}

const METHODOLOGIES: Record<string, RulesConfig> = {
  'bold-carbon': {
    'credit-order': ['rewards-distribution'],
    'gas-id': ['rewards-distribution'],
    'mass-id': [
      'waste-mass-is-unique',
      'no-conflicting-gas-id-or-credit',
      'project-period-limit',
      'participant-accreditations-and-verifications-requirements',
      'mass-id-qualifications',
      'regional-waste-classification',
      'geolocation-and-address-precision',
      'waste-origin-identification',
      'hauler-identification',
      'vehicle-identification',
      'driver-identification',
      'transport-manifest-data',
      'processor-identification',
      'recycler-identification',
      'weighing',
      'drop-off-at-recycler',
      'mass-id-sorting',
      'composting-cycle-timeframe',
      'recycling-manifest-data',
      'project-boundary',
      'prevented-emissions',
    ],
  },
  'bold-recycling': {
    'credit-order': ['rewards-distribution'],
    'mass-id': [
      'waste-mass-is-unique',
      'no-conflicting-recycled-id-or-credit',
      'project-period-limit',
      'participant-accreditations-and-verifications-requirements',
      'mass-id-qualifications',
      'regional-waste-classification',
      'geolocation-and-address-precision',
      'waste-origin-identification',
      'hauler-identification',
      'vehicle-identification',
      'driver-identification',
      'transport-manifest-data',
      'processor-identification',
      'recycler-identification',
      'weighing',
      'drop-off-at-recycler',
      'mass-id-sorting',
      'composting-cycle-timeframe',
      'recycling-manifest-data',
    ],
    'recycled-id': ['rewards-distribution'],
  },
  bold: {
    'mass-certificate': ['rewards-distribution'],
  },
};

// Scope names in config that differ from lib directory names
const SCOPE_TO_LIB: Record<string, string> = {
  'gas-id': 'mass-id-certificate',
  'mass-certificate': 'mass-id-certificate',
  'recycled-id': 'mass-id-certificate',
};

// Rule slugs in config that differ from lib directory names
const SLUG_TO_LIB: Record<string, string> = {
  'no-conflicting-gas-id-or-credit': 'no-conflicting-certificate-or-credit',
  'no-conflicting-recycled-id-or-credit':
    'no-conflicting-certificate-or-credit',
  'recycling-manifest-data': 'document-manifest-data',
  'transport-manifest-data': 'document-manifest-data',
};

// --- Helpers ---

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function dirExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function readFileIfExists(filePath: string): string | undefined {
  if (!fileExists(filePath)) return undefined;
  return fs.readFileSync(filePath, 'utf8');
}

function getLibSrcPath(scope: string, slug: string): string {
  const libScope = SCOPE_TO_LIB[scope] ?? scope;
  const libSlug = SLUG_TO_LIB[slug] ?? slug;
  return path.join(LIB_RULE_PROCESSORS, libScope, libSlug, 'src');
}

function getAppRulePath(
  methodology: string,
  scope: string,
  slug: string,
): string {
  return path.join(
    APPS_METHODOLOGIES,
    methodology,
    'rule-processors',
    scope,
    slug,
  );
}

function getSourceCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

// --- Rule Definition extraction ---

interface RuleDefinitionData {
  description: string;
  events: string[];
  frameworkRules: string[];
  name: string;
  slug: string;
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

  // Extract events array
  const eventsMatch = content.match(/events:\s*\[([\s\S]*?)\]/);
  const events: string[] = [];
  if (eventsMatch?.[1]) {
    const eventsContent = eventsMatch[1];
    const eventEntries =
      eventsContent.match(
        /DocumentEventName\.(\w+)|['"`]([^'"`]+)['"`]/g,
      ) ?? [];
    for (const entry of eventEntries) {
      const enumMatch = entry.match(/DocumentEventName\.(\w+)/);
      if (enumMatch?.[1]) {
        events.push(enumMatch[1]);
      } else {
        const strMatch = entry.match(/['"`]([^'"`]+)['"`]/);
        if (strMatch?.[1]) events.push(strMatch[1]);
      }
    }
  }

  // Extract frameworkRules array
  const fwMatch = content.match(/frameworkRules:\s*\[([\s\S]*?)\]/);
  const frameworkRules: string[] = [];
  if (fwMatch?.[1]) {
    const strMatches = fwMatch[1].matchAll(/['"`]([^'"`]+)['"`]/g);
    for (const m of strMatches) {
      if (m[1]) frameworkRules.push(m[1]);
    }
  }

  return {
    description: descMatch?.[1]?.trim() ?? '',
    events,
    frameworkRules,
    name: nameMatch?.[1] ?? libSlug,
    slug: slugMatch?.[1] ?? libSlug,
  };
}

// --- Error messages extraction ---

function extractErrorMessages(srcPath: string): string[] {
  const errors: string[] = [];
  const files = dirExists(srcPath) ? fs.readdirSync(srcPath) : [];
  const errorsFile = files.find((f) => f.endsWith('.errors.ts'));
  if (!errorsFile) return errors;

  const content = fs.readFileSync(path.join(srcPath, errorsFile), 'utf8');

  // Match ERROR_MESSAGE or ERROR_MESSAGES object
  const objMatch = content.match(
    /ERROR_MESSAGES?\s*=\s*\{([\s\S]*?)\}\s*as\s+const/,
  );
  if (!objMatch?.[1]) return errors;

  const inner = objMatch[1];

  // Extract template literals
  const templateRe = /`([^`]*)`/g;
  let match;
  while ((match = templateRe.exec(inner)) !== null) {
    const msg = normalizeMessage(match[1]?.trim() ?? '');
    if (msg && msg.length > 10 && !errors.includes(msg)) {
      errors.push(msg);
    }
  }

  // Extract string literals
  const stringRe = /['"]([^'"]{10,})['"]/g;
  while ((match = stringRe.exec(inner)) !== null) {
    const msg = match[1]?.trim() ?? '';
    if (msg && !errors.includes(msg)) {
      errors.push(msg);
    }
  }

  return errors;
}

// --- Result comments extraction ---

interface ResultComments {
  failed: string[];
  passed: string[];
}

function extractResultComments(srcPath: string): ResultComments {
  const files = dirExists(srcPath) ? fs.readdirSync(srcPath) : [];
  const constantsFile = files.find((f) => f.endsWith('.constants.ts'));
  if (!constantsFile) return { failed: [], passed: [] };

  const content = fs.readFileSync(
    path.join(srcPath, constantsFile),
    'utf8',
  );

  const passed = extractNestedStrings(content, 'passed');
  const failed = extractNestedStrings(content, 'failed');

  return { failed, passed };
}

function extractNestedStrings(content: string, section: string): string[] {
  const results: string[] = [];

  // Match the section block: passed: { ... } or failed: { ... }
  const sectionRe = new RegExp(
    `${section}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`,
    'm',
  );
  const sectionMatch = content.match(sectionRe);
  if (!sectionMatch?.[1]) return results;

  const inner = sectionMatch[1];

  // Extract template literals
  const templateRe = /`([^`]*)`/g;
  let match;
  while ((match = templateRe.exec(inner)) !== null) {
    const msg = normalizeMessage(match[1]?.trim() ?? '');
    if (msg && msg.length > 5 && !results.includes(msg)) {
      results.push(msg);
    }
  }

  // Extract string literals
  const stringRe = /['"]([^'"]{5,})['"]/g;
  while ((match = stringRe.exec(inner)) !== null) {
    const msg = match[1]?.trim() ?? '';
    if (msg && !results.includes(msg)) {
      results.push(msg);
    }
  }

  return results;
}

// --- Message normalization ---

const KNOWN_PLACEHOLDERS: Record<string, string> = {
  actorType: 'ACTOR_TYPE',
  actorTypes: 'ACTOR_TYPES_LIST',
  addressDistance: 'ADDRESS_DISTANCE',
  category: 'CATEGORY',
  certificateSubtype: 'CERTIFICATE_SUBTYPE',
  deductedWeight: 'DEDUCTED_WEIGHT',
  documentId: 'DOCUMENT_ID',
  expectedDeducted: 'EXPECTED_DEDUCTED',
  gpsDistance: 'GPS_DISTANCE',
  grossWeight: 'GROSS_WEIGHT',
  measurementUnit: 'MEASUREMENT_UNIT',
  methodologyName: 'METHODOLOGY_NAME',
  missingRequiredActors: 'MISSING_REQUIRED_ACTORS_LIST',
  participantId: 'PARTICIPANT_ID',
  participantNames: 'PARTICIPANT_NAMES_LIST',
  sortingFactor: 'SORTING_FACTOR',
  subtype: 'SUBTYPE',
  supportedFormats: 'SUPPORTED_FORMATS',
  type: 'TYPE',
  value: 'VALUE',
  vehicleType: 'VEHICLE_TYPE',
};

function normalizeMessage(str: string): string {
  if (!str) return str;

  // Replace ${identifier} with {{TOKEN}}
  let result = str.replace(/\$\{([^}]+)\}/g, (_match, inner: string) => {
    const ident = inner.split(/[.([\]]/)[0]?.trim() ?? '';
    const token = KNOWN_PLACEHOLDERS[ident];
    if (token) return `{{${token}}}`;

    // Convert camelCase to UPPER_SNAKE
    const snake = ident
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toUpperCase();
    return `{{${snake || 'VALUE'}}}`;
  });

  // Clean up escaped quotes
  result = result.replace(/\\"/g, '"');

  return result.trim();
}

// --- Examples extraction ---

interface RuleExample {
  description: string;
  output: {
    resultComment?: string;
    resultStatus: string;
  };
}

function extractExamples(srcPath: string): RuleExample[] {
  const examples: RuleExample[] = [];
  const files = dirExists(srcPath) ? fs.readdirSync(srcPath) : [];
  const testCasesFile = files.find((f) => f.includes('test-cases'));
  if (!testCasesFile) return examples;

  const content = fs.readFileSync(path.join(srcPath, testCasesFile), 'utf8');

  // Find all scenario + resultStatus pairs using regex on full content.
  // Match scenario strings (simple or template literals with interpolations)
  const scenarioRe =
    /scenario:\s*(?:`((?:[^`]|\$\{[^}]*\})*)`|'([^']*)'|"([^"]*)")/g;
  let scenarioMatch;

  while ((scenarioMatch = scenarioRe.exec(content)) !== null) {
    const rawScenario =
      scenarioMatch[1] ?? scenarioMatch[2] ?? scenarioMatch[3] ?? '';

    // Look for resultStatus within a reasonable window after the scenario
    const searchWindow = content.slice(
      scenarioMatch.index,
      scenarioMatch.index + 500,
    );
    const statusMatch = searchWindow.match(
      /resultStatus:\s*RuleOutputStatus\.(\w+)/,
    );

    // Also look backwards (resultStatus may come before scenario)
    let status: string | undefined;
    if (statusMatch?.[1]) {
      status = statusMatch[1];
    } else {
      const backWindow = content.slice(
        Math.max(0, scenarioMatch.index - 500),
        scenarioMatch.index,
      );
      const backStatusMatch = backWindow.match(
        /resultStatus:\s*RuleOutputStatus\.(\w+)/,
      );
      if (backStatusMatch?.[1]) {
        status = backStatusMatch[1];
      }
    }

    if (!status) continue;

    let description = rawScenario
      .replace(/\$\{[^}]*\}/g, (m) => {
        const inner = m.slice(2, -1).trim();
        return inner.split(/[.(]/)[0]?.trim() ?? '';
      })
      .trim();

    // Capitalize first letter
    if (description) {
      description =
        description.charAt(0).toUpperCase() + description.slice(1);
    }

    // Skip descriptions that are too short or contain code
    if (
      description.length < 10 ||
      /\.(join|slice|split)\s*\(/.test(description)
    ) {
      continue;
    }

    const example: RuleExample = {
      description,
      output: {
        resultStatus: status === 'PASSED' ? 'PASSED' : 'REJECTED',
      },
    };

    examples.push(example);
  }

  return examples;
}

// --- README extraction ---

interface ReadmeData {
  description: string;
  name: string;
  verifications: string[];
}

function extractReadmeData(readmePath: string): ReadmeData {
  const result: ReadmeData = { description: '', name: '', verifications: [] };

  const content = readFileIfExists(readmePath);
  if (!content) return result;

  // Extract title (first # heading)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch?.[1]) {
    result.name = titleMatch[1].trim();
  }

  // Extract description (first paragraph after ## Description)
  const descMatch = content.match(
    /##\s+(?:📄\s+)?Description\s*\n\n(.+?)(?:\n\n|\n##)/s,
  );
  if (descMatch?.[1]) {
    result.description = descMatch[1].trim();
  }

  // Extract verifications
  const verifMatch = content.match(
    /##\s+(?:✅\s+)?Verification(?:\s+Criteria)?\s*\n([\s\S]*?)(?:\n##|\n---|\z)/,
  );
  if (verifMatch?.[1]) {
    const bullets = verifMatch[1].match(/^[-*]\s+(.+)$/gm);
    if (bullets) {
      result.verifications = bullets.map((b) =>
        b.replace(/^[-*]\s+/, '').trim(),
      );
    }
  }

  return result;
}

// --- Manifest builder ---

interface ManifestRule {
  description: string;
  errors: string[];
  events: string[];
  examples: RuleExample[];
  implementationPath: string;
  implementsFrameworkRules: string[];
  methodology: string;
  name: string;
  readmePath: string;
  scope: string;
  slug: string;
  successComments: string[];
  verifications: string[];
}

function buildRule(
  methodology: string,
  scope: string,
  slug: string,
): ManifestRule {
  const libSrcPath = getLibSrcPath(scope, slug);
  const appRulePath = getAppRulePath(methodology, scope, slug);
  const readmePath = path.join(appRulePath, 'README.md');
  const relReadmePath = path
    .relative(ROOT, readmePath)
    .split(path.sep)
    .join('/');

  // Get lib slug for processor file resolution
  const libSlug = SLUG_TO_LIB[slug] ?? slug;

  // Find processor file
  const files = dirExists(libSrcPath) ? fs.readdirSync(libSrcPath) : [];
  const processorFile =
    files.find((f) => f.endsWith('.processor.ts') && !f.includes('.spec.')) ??
    `${libSlug}.processor.ts`;
  const relImplementationPath = path
    .relative(ROOT, path.join(libSrcPath, processorFile))
    .split(path.sep)
    .join('/');

  // Extract data from each source
  const ruleDef = extractRuleDefinition(libSrcPath, slug);
  const readme = extractReadmeData(readmePath);
  const errorMessages = extractErrorMessages(libSrcPath);
  const resultComments = extractResultComments(libSrcPath);
  const examples = extractExamples(libSrcPath);

  // Merge errors: errors.ts + RESULT_COMMENTS.failed
  const allErrors = [...errorMessages];
  for (const msg of resultComments.failed) {
    if (!allErrors.includes(msg)) {
      allErrors.push(msg);
    }
  }

  // Determine verifications
  const verifications =
    readme.verifications.length > 0
      ? readme.verifications
      : ['Validation criteria are implemented in the processor.'];

  return {
    description: ruleDef?.description ?? readme.description,
    errors: allErrors.map((e) => normalizeMessage(e)),
    events: ruleDef?.events ?? [],
    examples,
    implementationPath: relImplementationPath,
    implementsFrameworkRules: ruleDef?.frameworkRules ?? [],
    methodology,
    name: ruleDef?.name ?? readme.name ?? slug,
    readmePath: relReadmePath,
    scope,
    slug,
    successComments: resultComments.passed.map((s) => normalizeMessage(s)),
    verifications,
  };
}

// --- Main ---

interface Manifest {
  $schema: string;
  generatedAt: string;
  methodologies: Record<string, Record<string, ManifestRule[]>>;
  sourceCommit: string;
  version: string;
}

function generate(): void {
  const manifest: Manifest = {
    $schema: './schemas/application-rules-manifest.schema.json',
    generatedAt: new Date().toISOString(),
    methodologies: {},
    sourceCommit: getSourceCommit(),
    version: '1.0.0',
  };

  let totalRules = 0;
  let rulesWithExamples = 0;
  let rulesWithErrors = 0;
  const warnings: string[] = [];

  for (const [methodology, scopes] of Object.entries(METHODOLOGIES)) {
    manifest.methodologies[methodology] = {};

    for (const [scope, slugs] of Object.entries(scopes)) {
      const rules: ManifestRule[] = [];

      for (const slug of slugs) {
        const rule = buildRule(methodology, scope, slug);
        rules.push(rule);
        totalRules++;

        if (rule.examples.length > 0) rulesWithExamples++;
        if (rule.errors.length > 0) rulesWithErrors++;

        if (rule.examples.length === 0) {
          warnings.push(`${methodology}/${scope}/${slug}: no examples`);
        }
        if (rule.errors.length === 0) {
          warnings.push(`${methodology}/${scope}/${slug}: no errors`);
        }
      }

      manifest.methodologies[methodology]![scope] = rules;
    }
  }

  // Write output
  if (!dirExists(DIST)) {
    fs.mkdirSync(DIST, { recursive: true });
  }

  const outputPath = path.join(DIST, 'application-rules-manifest.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');

  // Print summary
  console.log('Generated application-rules-manifest.json');
  console.log(`  Commit: ${manifest.sourceCommit.slice(0, 7)}`);
  console.log(
    `  Methodologies: ${Object.keys(manifest.methodologies).length}`,
  );
  console.log(`  Total rules: ${totalRules}`);
  console.log(
    `  Rules with examples: ${rulesWithExamples}/${totalRules}`,
  );
  console.log(`  Rules with errors: ${rulesWithErrors}/${totalRules}`);

  if (warnings.length > 0) {
    console.log(`  Warnings: ${warnings.length}`);
    for (const warning of warnings) {
      console.log(`    - ${warning}`);
    }
  }
}

generate();
