#!/usr/bin/env ts-node

/**
 * Generates application-rules-manifest.json — the cross-repo contract
 * between methodology-rules and carrot-docs.
 *
 * Usage: pnpm exec ts-node --compiler ts-patch/compiler --project scripts/tsconfig.manifest.json scripts/generate-application-rules-manifest.ts
 * Output: dist/application-rules-manifest.json
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { register } from 'tsconfig-paths';

// Register tsconfig path aliases so that require() resolves @carrot-fndn/* imports
const tsConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'tsconfig.paths.json'), 'utf8'),
) as { compilerOptions: { paths: Record<string, string[]> } };
register({
  baseUrl: path.resolve(__dirname, '..'),
  paths: tsConfig.compilerOptions.paths,
});

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
const LIBS_METHODOLOGIES = path.join(ROOT, 'libs', 'methodologies');

// --- Methodology configs ---

function getRulesConfigPath(methodology: string): string | undefined {
  // Prefer lib-level rules config, fall back to apps-level
  const libPath = path.join(
    LIBS_METHODOLOGIES,
    methodology,
    'rules',
    'src',
    'rules.config.ts',
  );
  if (fileExists(libPath)) return libPath;

  const appPath = path.join(APPS_METHODOLOGIES, methodology, 'rules.config.ts');
  if (fileExists(appPath)) return appPath;

  return undefined;
}

function loadMethodologies(): Record<
  string,
  Record<string, readonly string[]>
> {
  const methodologies: Record<string, Record<string, readonly string[]>> = {};

  for (const entry of fs.readdirSync(APPS_METHODOLOGIES, {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;

    const configPath = getRulesConfigPath(entry.name);
    if (!configPath) continue;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { rulesConfig } = require(configPath) as {
      rulesConfig: Record<string, readonly string[]>;
    };
    methodologies[entry.name] = rulesConfig;
  }

  return methodologies;
}

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

// --- Framework rule slugs loader ---

function loadFrameworkRuleSlugs(methodology: string): Set<string> {
  const fwPath = path.join(
    ROOT,
    'libs',
    'methodologies',
    methodology,
    'rules',
    'src',
    'framework-rules.ts',
  );

  if (!fileExists(fwPath)) {
    return new Set<string>();
  }

  const content = fs.readFileSync(fwPath, 'utf8');
  const slugs = new Set<string>();
  const slugRe = /slug:\s*['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = slugRe.exec(content)) !== null) {
    if (match[1]) slugs.add(match[1]);
  }

  return slugs;
}

// --- App-level frameworkRules extraction ---

function extractAppFrameworkRules(
  appRulePath: string,
): string[] | undefined {
  const ruleDefPath = path.join(appRulePath, 'src', 'rule-definition.ts');

  if (!fileExists(ruleDefPath)) return undefined;

  const content = fs.readFileSync(ruleDefPath, 'utf8');
  const fwMatch = content.match(/frameworkRules:\s*\[([\s\S]*?)\]/);

  if (!fwMatch?.[1]) return [];

  const rules: string[] = [];
  const strMatches = fwMatch[1].matchAll(/['"`]([^'"`]+)['"`]/g);

  for (const m of strMatches) {
    if (m[1]) rules.push(m[1]);
  }

  return rules;
}

// --- Enum resolution ---

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DocumentEventName } = require(
  '@carrot-fndn/shared/methodologies/bold/types',
) as { DocumentEventName: Record<string, string> };

// --- Actor label extraction from processor files ---

/**
 * Converts an UPPER_SNAKE_CASE enum key to PascalCase.
 * e.g. "WASTE_GENERATOR" → "WasteGenerator", "HAULER" → "Hauler"
 */
function upperSnakeToPascalCase(str: string): string {
  return str
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Parses a processor file to extract which actor labels are used with ACTOR events.
 * Looks for patterns like:
 *   - eventLabelIsAnyOf([HAULER, RECYCLER])
 *   - eventHasLabel(event, PROCESSOR)
 * Returns PascalCase labels, e.g. ["Hauler", "Recycler"]
 */
function extractActorLabelsFromProcessor(processorPath: string): string[] {
  const content = fs.readFileSync(processorPath, 'utf8');
  const labels = new Set<string>();

  // Match eventLabelIsAnyOf([LABEL1, MethodologyDocumentEventLabel.LABEL2, ...])
  const labelIsAnyOfRe = /eventLabelIsAnyOf\(\[([^\]]+)\]/g;
  let match;
  while ((match = labelIsAnyOfRe.exec(content)) !== null) {
    const inner = match[1] ?? '';
    for (const token of inner.split(',')) {
      const trimmed = token.trim();
      // Handle fully qualified: MethodologyDocumentEventLabel.HAULER
      const qualifiedMatch = trimmed.match(
        /MethodologyDocumentEventLabel\.([A-Z_]+)/,
      );
      if (qualifiedMatch?.[1]) {
        labels.add(qualifiedMatch[1]);
      } else if (trimmed && /^[A-Z_]+$/.test(trimmed)) {
        labels.add(trimmed);
      }
    }
  }

  // Match eventHasLabel(event, LABEL) or eventHasLabel(event, MethodologyDocumentEventLabel.LABEL)
  const hasLabelRe =
    /eventHasLabel\(\w+,\s*(?:MethodologyDocumentEventLabel\.)?([A-Z_]+)\)/g;
  while ((match = hasLabelRe.exec(content)) !== null) {
    if (match[1]) {
      labels.add(match[1]);
    }
  }

  return [...labels].sort().map(upperSnakeToPascalCase);
}

/**
 * Enriches the events list by replacing plain "ACTOR" entries with
 * "ACTOR:Label" entries based on the actor labels found in the processor.
 * If no actor labels are found, the "ACTOR" entry is kept as-is.
 */
function enrichActorEvents(
  events: string[],
  actorLabels: string[],
): string[] {
  if (actorLabels.length === 0) return events;

  const actorValue = DocumentEventName['ACTOR'] ?? 'ACTOR';

  return events.flatMap((event) =>
    event === actorValue
      ? actorLabels.map((label) => `${actorValue}:${label}`)
      : [event],
  );
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
  srcFiles: string[],
  slug: string,
): RuleDefinitionData | undefined {
  const libSlug = SLUG_TO_LIB[slug] ?? slug;
  const ruleDefFile = srcFiles.find((f) => f.endsWith('.rule-definition.ts'));

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
        const enumKey = enumMatch[1];
        events.push(DocumentEventName[enumKey] ?? enumKey);
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

interface ErrorMessagesResult {
  byKey: Record<string, string>;
  values: string[];
}

function extractErrorMessages(
  srcPath: string,
  srcFiles: string[],
): ErrorMessagesResult {
  const values: string[] = [];
  const byKey: Record<string, string> = {};
  const errorsFile = srcFiles.find((f) => f.endsWith('.errors.ts'));
  if (!errorsFile) return { byKey, values };

  const content = fs.readFileSync(path.join(srcPath, errorsFile), 'utf8');

  // Find ERROR_MESSAGE(S) assignment and extract its brace-balanced body
  const assignMatch = content.match(/ERROR_MESSAGES?\s*=\s*\{/);
  if (!assignMatch || assignMatch.index === undefined) return { byKey, values };

  const braceStart = (assignMatch.index ?? 0) + assignMatch[0].length - 1;
  const { end: braceEnd } = findEnclosingObjectBounds(content, braceStart + 1);
  const inner = content.slice(braceStart + 1, braceEnd - 1);

  // Extract keyed template literals
  const keyedTemplateRe = /(\w+)\s*:\s*`([^`]*)`/g;
  let match;
  while ((match = keyedTemplateRe.exec(inner)) !== null) {
    const key = match[1] ?? '';
    const msg = normalizeMessage(match[2]?.trim() ?? '');
    if (msg && msg.length > 10) {
      byKey[key] = msg;
      if (!values.includes(msg)) {
        values.push(msg);
      }
    }
  }

  // Extract keyed string literals
  const keyedStringRe = /(\w+)\s*:\s*['"]([^'"]{10,})['"]/g;
  while ((match = keyedStringRe.exec(inner)) !== null) {
    const key = match[1] ?? '';
    const msg = match[2]?.trim() ?? '';
    if (msg) {
      if (!byKey[key]) byKey[key] = msg;
      if (!values.includes(msg)) {
        values.push(msg);
      }
    }
  }

  return { byKey, values };
}

// --- Result comments extraction ---

interface ResultComments {
  failed: string[];
  failedByKey: Record<string, string>;
  passed: string[];
  passedByKey: Record<string, string>;
}

function extractResultComments(
  srcPath: string,
  srcFiles: string[],
): ResultComments {
  const constantsFile = srcFiles.find((f) => f.endsWith('.constants.ts'));
  if (!constantsFile)
    return { failed: [], failedByKey: {}, passed: [], passedByKey: {} };

  const content = fs.readFileSync(
    path.join(srcPath, constantsFile),
    'utf8',
  );

  const passed = extractNestedStrings(content, 'passed');
  const failed = extractNestedStrings(content, 'failed');

  return {
    failed: failed.values,
    failedByKey: failed.byKey,
    passed: passed.values,
    passedByKey: passed.byKey,
  };
}

interface NestedStringsResult {
  byKey: Record<string, string>;
  values: string[];
}

function extractNestedStrings(
  content: string,
  section: string,
): NestedStringsResult {
  const values: string[] = [];
  const byKey: Record<string, string> = {};

  // Match the section block: passed: { ... } or failed: { ... }
  const sectionRe = new RegExp(
    `${section}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`,
    'm',
  );
  const sectionMatch = content.match(sectionRe);
  if (!sectionMatch?.[1]) return { byKey, values };

  const inner = sectionMatch[1];

  // Extract keyed entries: KEY_NAME: `value` or KEY_NAME: 'value'
  const keyedTemplateRe = /(\w+)\s*:\s*`([^`]*)`/g;
  let match;
  while ((match = keyedTemplateRe.exec(inner)) !== null) {
    const key = match[1] ?? '';
    const msg = normalizeMessage(match[2]?.trim() ?? '');
    if (msg && msg.length > 5) {
      byKey[key] = msg;
      if (!values.includes(msg)) {
        values.push(msg);
      }
    }
  }

  const keyedStringRe = /(\w+)\s*:\s*['"]([^'"]{5,})['"]/g;
  while ((match = keyedStringRe.exec(inner)) !== null) {
    const key = match[1] ?? '';
    const msg = match[2]?.trim() ?? '';
    if (msg) {
      if (!byKey[key]) byKey[key] = msg;
      if (!values.includes(msg)) {
        values.push(msg);
      }
    }
  }

  return { byKey, values };
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

function camelToUpperSnake(str: string): string {
  const snake = str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toUpperCase();

  return snake || 'VALUE';
}

function resolvePlaceholder(ident: string): string {
  return KNOWN_PLACEHOLDERS[ident] ?? camelToUpperSnake(ident);
}

function normalizeMessage(str: string): string {
  if (!str) return str;

  // Replace ${String(identifier)} and ${identifier} with {{TOKEN}}
  const result = str
    .replace(/\$\{String\((\w+)\)\}/g, (_match, inner: string) => {
      return `{{${resolvePlaceholder(inner)}}}`;
    })
    .replace(/\$\{([^}]+)\}/g, (_match, inner: string) => {
      const ident = inner.split(/[.([\]]/)[0]?.trim() ?? '';
      return `{{${resolvePlaceholder(ident)}}}`;
    })
    .replace(/\\"/g, '"');

  return result.trim();
}

const CODE_LEAK_PATTERNS = [
  /\.join\s*\(/,
  /`,\s*\n/,
  /\)\s*=>\s*\n/,
  /^\s*\$\{/,
  /\[['"`]/,
];

const PLACEHOLDER_ONLY_RE = /^\{\{[A-Z_]+\}\}$/;
function isCodeLeak(s: string): boolean {
  return CODE_LEAK_PATTERNS.some((re) => re.test(s));
}

function isPlaceholderOnly(s: string): boolean {
  return PLACEHOLDER_ONLY_RE.test(s);
}

function normalizeMessages(messages: string[]): string[] {
  return messages
    .map((s) => normalizeMessage(s))
    .filter((s) => !isPlaceholderOnly(s) && !isCodeLeak(s));
}

// --- Examples extraction (runtime require) ---

interface ManifestExample {
  exampleDocuments: Record<string, unknown>;
  resultComment: string;
  resultStatus: string;
  scenario: string;
}

interface ManifestFieldsOverride {
  additionalAttributes?: string[];
  excludeAttributes?: string[];
  includeAddress?: boolean;
  includeCurrentValue?: boolean;
  includeValue?: boolean;
}

interface RuleTestCaseShape {
  manifestExample?: boolean;
  manifestFields?: ManifestFieldsOverride;
  resultComment: unknown;
  resultStatus: unknown;
  scenario: string;
}

function extractManifestExamples(
  srcPath: string,
  srcFiles: string[],
): ManifestExample[] {
  const testCasesFile = srcFiles.find((f) => f.endsWith('.test-cases.ts'));
  if (!testCasesFile) return [];

  const testCasesPath = path.join(srcPath, testCasesFile);

  let mod: Record<string, unknown>;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require(testCasesPath) as Record<string, unknown>;
  } catch (error) {
    console.warn(`  Warning: could not require ${testCasesPath}: ${error}`);
    return [];
  }

  // Collect all exported arrays (there may be multiple, e.g. testCases + errorTestCases)
  const allTestCases: RuleTestCaseShape[] = [];
  for (const value of Object.values(mod)) {
    if (Array.isArray(value)) {
      allTestCases.push(...(value as RuleTestCaseShape[]));
    }
  }

  // Filter to manifest-flagged cases
  const manifestCases = allTestCases.filter(
    (tc) => tc.manifestExample === true,
  );

  return manifestCases.map((tc) => ({
    exampleDocuments: normalizeTestCasePayload(
      tc as unknown as Record<string, unknown>,
      tc.manifestFields,
    ),
    resultComment: String(tc.resultComment ?? ''),
    resultStatus: String(tc.resultStatus ?? ''),
    scenario: tc.scenario,
  }));
}

// --- Document normalizer ---

const EXPLICIT_ATTRIBUTES = Symbol.for('manifest:explicitAttributes');

const TEST_CASE_META_KEYS = new Set([
  'scenario',
  'resultComment',
  'resultStatus',
  'manifestExample',
  'manifestFields',
]);

function normalizeTestCasePayload(
  testCase: Record<string, unknown>,
  fieldsOverride?: ManifestFieldsOverride,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(testCase)) {
    if (TEST_CASE_META_KEYS.has(key)) continue;
    result[key] = normalizeValue(value, fieldsOverride);
  }

  return result;
}

function normalizeValue(
  value: unknown,
  fieldsOverride?: ManifestFieldsOverride,
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (value instanceof Map) {
    return Object.fromEntries(
      [...value.entries()].map(([k, v]) => [
        k,
        normalizeValue(v, fieldsOverride),
      ]),
    );
  }

  if (Array.isArray(value)) {
    return value.map((v) => normalizeValue(v, fieldsOverride));
  }

  const obj = value as Record<string, unknown>;

  // DocumentEvent shape detection
  if ('name' in obj && ('metadata' in obj || 'value' in obj)) {
    return normalizeDocumentEvent(obj, fieldsOverride);
  }

  // Document shape detection
  if ('category' in obj && 'externalEvents' in obj) {
    return normalizeDocument(obj, fieldsOverride);
  }

  // Participant shape detection — strip random noise
  if (isParticipantLike(obj)) {
    return normalizeParticipant(obj);
  }

  // Generic object — recurse
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      normalizeValue(v, fieldsOverride),
    ]),
  );
}

const PARTICIPANT_MARKER_KEYS = new Set([
  'businessName',
  'taxId',
  'piiSnapshotId',
  'taxIdType',
]);

function isParticipantLike(obj: Record<string, unknown>): boolean {
  if (typeof obj['type'] !== 'string' || typeof obj['id'] !== 'string') {
    return false;
  }

  return Object.keys(obj).some((k) => PARTICIPANT_MARKER_KEYS.has(k));
}

function normalizeParticipant(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: obj['id'],
    type: obj['type'],
  };

  return result;
}

const ADDRESS_RELEVANT_KEYS = new Set([
  'latitude',
  'longitude',
  'countryCode',
  'city',
  'state',
  'street',
  'number',
  'zipCode',
]);

function normalizeAddress(
  address: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of ADDRESS_RELEVANT_KEYS) {
    if (address[key] !== undefined) {
      result[key] = address[key];
    }
  }

  return Object.keys(result).length > 0 ? result : address;
}

/**
 * Filters out obviously random attribute names generated by test fixture generators.
 * Real attribute names follow a "Title Case With Spaces" pattern (e.g., "Driver Identifier").
 * Random strings are long lowercase alphanumeric strings without spaces.
 */
function isValidAttributeName(name: string): boolean {
  // Real attribute names contain spaces and are relatively short
  if (name.includes(' ') && name.length < 80) return true;
  // Single-word names are valid if they look like real identifiers (not random strings)
  if (name.length <= 30 && /^[A-Z]/.test(name)) return true;

  return false;
}

function buildAllowedAttributeSet(
  event: Record<string, unknown>,
  fieldsOverride?: ManifestFieldsOverride,
): Set<string> | undefined {
  // Get auto-detected explicit attributes from the stub builder
  const explicitAttrs = (event as Record<symbol, unknown>)[
    EXPLICIT_ATTRIBUTES
  ] as string[] | undefined;

  if (
    !explicitAttrs &&
    !fieldsOverride?.additionalAttributes &&
    !fieldsOverride?.excludeAttributes
  ) {
    return undefined; // No filter info — include all (fallback)
  }

  const allowedSet = new Set(explicitAttrs ?? []);

  for (const attr of fieldsOverride?.additionalAttributes ?? []) {
    allowedSet.add(attr);
  }

  for (const attr of fieldsOverride?.excludeAttributes ?? []) {
    allowedSet.delete(attr);
  }

  return allowedSet;
}

function normalizeDocumentEvent(
  event: Record<string, unknown>,
  fieldsOverride?: ManifestFieldsOverride,
): Record<string, unknown> {
  const result: Record<string, unknown> = { name: event['name'] };

  // Include label for ACTOR events (e.g., "Waste Generator", "Hauler")
  if (event['label'] !== undefined) {
    result['label'] = event['label'];
  }

  // Exclude value by default, include only when explicitly requested
  if (fieldsOverride?.includeValue === true && event['value'] !== undefined) {
    result['value'] = event['value'];
  }

  // Include address only if explicitly requested
  if (fieldsOverride?.includeAddress === true && event['address']) {
    result['address'] = normalizeAddress(
      event['address'] as Record<string, unknown>,
    );
  }

  // Filter metadata attributes based on explicit attributes + overrides
  const allowedSet = buildAllowedAttributeSet(event, fieldsOverride);

  const metadata = event['metadata'] as Record<string, unknown> | undefined;
  const attributes = metadata?.['attributes'] as
    | Array<Record<string, unknown>>
    | undefined;

  if (attributes?.length) {
    const filtered = allowedSet
      ? attributes.filter((attr) => allowedSet.has(String(attr['name'])))
      : attributes.filter((attr) => isValidAttributeName(String(attr['name'])));

    if (filtered.length) {
      result['metadata'] = {
        attributes: filtered.map((attr) => {
          const normalized: Record<string, unknown> = {
            name: attr['name'],
            value: attr['value'],
          };
          if (attr['format']) normalized['format'] = attr['format'];
          return normalized;
        }),
      };
    }
  }

  return result;
}

function normalizeDocument(
  doc: Record<string, unknown>,
  fieldsOverride?: ManifestFieldsOverride,
): Record<string, unknown> {
  const result: Record<string, unknown> = { category: doc['category'] };

  if (doc['type']) result['type'] = doc['type'];
  if (doc['subtype']) result['subtype'] = doc['subtype'];

  // Exclude currentValue by default, include only when explicitly requested
  if (
    fieldsOverride?.includeCurrentValue === true &&
    doc['currentValue'] !== undefined
  ) {
    result['currentValue'] = doc['currentValue'];
  }

  const events = doc['externalEvents'] as unknown[] | undefined;
  if (events?.length) {
    result['externalEvents'] = events.map((e) =>
      normalizeValue(e, fieldsOverride),
    );
  }

  return result;
}

// --- Brace-balanced object extraction (used by error/comment extractors) ---

interface ObjectBounds {
  end: number;
  start: number;
}

function isQuoteChar(ch: string | undefined): ch is '"' | "'" | '`' {
  return ch === '"' || ch === "'" || ch === '`';
}

function findEnclosingObjectBounds(
  content: string,
  position: number,
): ObjectBounds {
  // Scan backward to find the opening brace, skipping over string literals
  let depth = 0;
  let start = 0;
  for (let i = position - 1; i >= 0; i--) {
    const ch = content[i];
    if (isQuoteChar(ch)) {
      i--;
      while (i > 0 && content[i] !== ch) {
        if (content[i] === '\\') i--;
        i--;
      }
      continue;
    }
    if (ch === '}') depth++;
    if (ch === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }

  // Scan forward from the opening brace, skipping over string literals
  depth = 0;
  let end = content.length;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (isQuoteChar(ch)) {
      i++;
      while (i < content.length && content[i] !== ch) {
        if (content[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  return { end, start };
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
    /##\s+(?:✅\s+)?Verification(?:\s+Criteria)?\s*\n([\s\S]*?)(?:\n##|\n---|\n?$)/,
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
  examples: ManifestExample[];
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
  validFrameworkSlugs: Set<string>,
): ManifestRule {
  const libSrcPath = getLibSrcPath(scope, slug);

  if (!dirExists(libSrcPath)) {
    throw new Error(
      `Rule source directory not found: ${libSrcPath} (methodology=${methodology}, scope=${scope}, slug=${slug})`,
    );
  }

  const appRulePath = getAppRulePath(methodology, scope, slug);
  const readmePath = path.join(appRulePath, 'README.md');
  const relReadmePath = path
    .relative(ROOT, readmePath)
    .split(path.sep)
    .join('/');

  // Get lib slug for processor file resolution
  const libSlug = SLUG_TO_LIB[slug] ?? slug;

  // Read directory once and pass to all extractors
  const srcFiles = fs.readdirSync(libSrcPath);

  // Find processor file
  const processorFile =
    srcFiles.find(
      (f) => f.endsWith('.processor.ts') && !f.includes('.spec.'),
    ) ?? `${libSlug}.processor.ts`;
  const processorFullPath = path.join(libSrcPath, processorFile);

  if (!fileExists(processorFullPath)) {
    throw new Error(
      `Processor file not found: ${processorFullPath} (methodology=${methodology}, scope=${scope}, slug=${slug})`,
    );
  }

  const relImplementationPath = path
    .relative(ROOT, processorFullPath)
    .split(path.sep)
    .join('/');

  // Extract data from each source
  const ruleDef = extractRuleDefinition(libSrcPath, srcFiles, slug);
  const readme = extractReadmeData(readmePath);
  const errorMessages = extractErrorMessages(libSrcPath, srcFiles);
  const resultComments = extractResultComments(libSrcPath, srcFiles);
  const examples = extractManifestExamples(libSrcPath, srcFiles);

  // Resolve frameworkRules: prefer app-level, fall back to shared lib
  const appRuleFrameworkRules = extractAppFrameworkRules(appRulePath);
  const frameworkRules = appRuleFrameworkRules ?? ruleDef?.frameworkRules ?? [];

  // Validate framework rule slugs against the methodology's framework-rules.ts
  const invalidSlugs = frameworkRules.filter(
    (s) => !validFrameworkSlugs.has(s),
  );
  if (invalidSlugs.length > 0) {
    throw new Error(
      `Invalid framework rule slug(s) [${invalidSlugs.join(', ')}] in ${methodology}/${scope}/${slug}. ` +
        `Valid slugs: ${[...validFrameworkSlugs].join(', ')}`,
    );
  }

  // Validate required fields
  const name = ruleDef?.name ?? readme.name;
  const description = ruleDef?.description ?? readme.description;

  if (!name) {
    throw new Error(
      `Rule name not found in rule definition or README: ${slug} (methodology=${methodology}, scope=${scope})`,
    );
  }

  if (!description) {
    throw new Error(
      `Rule description not found in rule definition or README: ${slug} (methodology=${methodology}, scope=${scope})`,
    );
  }

  // Merge errors: errors.ts + RESULT_COMMENTS.failed
  const allErrors = [...errorMessages.values];
  for (const msg of resultComments.failed) {
    if (!allErrors.includes(msg)) {
      allErrors.push(msg);
    }
  }

  // Enrich ACTOR events with actor labels from the processor
  const actorLabels = extractActorLabelsFromProcessor(processorFullPath);
  const events = enrichActorEvents(ruleDef?.events ?? [], actorLabels);

  // Determine verifications
  const verifications =
    readme.verifications.length > 0
      ? readme.verifications
      : ['Validation criteria are implemented in the processor.'];

  return {
    description,
    errors: normalizeMessages(allErrors),
    events,
    examples,
    implementationPath: relImplementationPath,
    implementsFrameworkRules: frameworkRules,
    methodology,
    name,
    readmePath: relReadmePath,
    scope,
    slug,
    successComments: normalizeMessages(resultComments.passed),
    verifications,
  };
}

// --- Main ---

interface Manifest {
  generatedAt: string;
  methodologies: Record<string, Record<string, ManifestRule[]>>;
  sourceCommit: string;
  version: string;
}

function assertManifest(value: unknown): asserts value is Manifest {
  const m = value as Record<string, unknown>;

  if (typeof m !== 'object' || m === null) {
    throw new Error('Manifest must be a non-null object');
  }

  if (typeof m['generatedAt'] !== 'string') {
    throw new Error('Manifest.generatedAt must be a string');
  }

  if (typeof m['sourceCommit'] !== 'string') {
    throw new Error('Manifest.sourceCommit must be a string');
  }

  if (typeof m['version'] !== 'string') {
    throw new Error('Manifest.version must be a string');
  }

  if (typeof m['methodologies'] !== 'object' || m['methodologies'] === null) {
    throw new Error('Manifest.methodologies must be a non-null object');
  }
}

interface ProcessRuleResult {
  hasErrors: boolean;
  hasExamples: boolean;
  rule: ManifestRule;
  warnings: string[];
}

function processRule(
  methodology: string,
  scope: string,
  slug: string,
  validFrameworkSlugs: Set<string>,
): ProcessRuleResult {
  const rule = buildRule(methodology, scope, slug, validFrameworkSlugs);
  const warnings: string[] = [];

  if (rule.examples.length === 0) {
    warnings.push(`${methodology}/${scope}/${slug}: no examples`);
  }
  if (rule.errors.length === 0) {
    warnings.push(`${methodology}/${scope}/${slug}: no errors`);
  }

  return {
    hasErrors: rule.errors.length > 0,
    hasExamples: rule.examples.length > 0,
    rule,
    warnings,
  };
}

interface ProcessScopeResult {
  rules: ManifestRule[];
  rulesWithErrors: number;
  rulesWithExamples: number;
  totalRules: number;
  warnings: string[];
}

function processScope(
  methodology: string,
  scope: string,
  slugs: readonly string[],
  validFrameworkSlugs: Set<string>,
): ProcessScopeResult {
  const result: ProcessScopeResult = {
    rules: [],
    rulesWithErrors: 0,
    rulesWithExamples: 0,
    totalRules: 0,
    warnings: [],
  };

  for (const slug of slugs) {
    const { hasErrors, hasExamples, rule, warnings } = processRule(
      methodology,
      scope,
      slug,
      validFrameworkSlugs,
    );

    result.rules.push(rule);
    result.totalRules++;
    if (hasExamples) result.rulesWithExamples++;
    if (hasErrors) result.rulesWithErrors++;
    result.warnings.push(...warnings);
  }

  return result;
}

function generate(): void {
  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    methodologies: {},
    sourceCommit: getSourceCommit(),
    version: '1.0.0',
  };

  let totalRules = 0;
  let rulesWithExamples = 0;
  let rulesWithErrors = 0;
  const warnings: string[] = [];

  for (const [methodology, scopes] of Object.entries(loadMethodologies())) {
    manifest.methodologies[methodology] = {};
    const validFrameworkSlugs = loadFrameworkRuleSlugs(methodology);

    for (const [scope, slugs] of Object.entries(scopes)) {
      const scopeResult = processScope(methodology, scope, slugs, validFrameworkSlugs);

      manifest.methodologies[methodology][scope] = scopeResult.rules;
      totalRules += scopeResult.totalRules;
      rulesWithExamples += scopeResult.rulesWithExamples;
      rulesWithErrors += scopeResult.rulesWithErrors;
      warnings.push(...scopeResult.warnings);
    }
  }

  // Write output
  if (!dirExists(DIST)) {
    fs.mkdirSync(DIST, { recursive: true });
  }

  const outputPath = path.join(DIST, 'application-rules-manifest.json');

  assertManifest(manifest);

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
