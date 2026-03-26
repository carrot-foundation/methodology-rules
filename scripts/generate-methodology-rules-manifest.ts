#!/usr/bin/env tsx

/**
 * Generates the unified methodology-rules-manifest.json — the single cross-repo
 * contract between methodology-rules, carrot-docs, and other consumers.
 *
 * Replaces both generate-application-rules-manifest.ts and
 * generate-methodology-framework-rules-manifest.ts.
 *
 * Usage: pnpm generate:manifest
 * Output: dist/methodology-rules-manifest.json
 */

import type { BaseMethodologyFrameworkRule } from '@carrot-fndn/shared/rule/types';

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { register } from 'tsconfig-paths';
import { z } from 'zod';

import { METHODOLOGY_FRAMEWORK_RULE_TYPES } from '../libs/shared/rule/types/src/methodology-framework-rule.types';

// ---------------------------------------------------------------------------
// Bootstrap: register tsconfig path aliases for require() resolution
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');

const tsConfig = JSON.parse(
  fs.readFileSync(path.resolve(ROOT, 'tsconfig.paths.json'), 'utf8'),
) as { compilerOptions: { paths: Record<string, string[]> } };
register({ baseUrl: ROOT, paths: tsConfig.compilerOptions.paths });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const MANIFEST_SCHEMA_VERSION = '2.0.0';

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

// ---------------------------------------------------------------------------
// Methodology discovery
// ---------------------------------------------------------------------------

interface MethodologyApplicationConfig {
  displayName: string;
  methodologyFrameworkVersion: string;
  version: string;
}

/**
 * Discover methodologies that have a methodology-application.config.ts file
 * under libs/methodologies/<name>/rules/src/.
 */
function discoverMethodologies(): string[] {
  return fs
    .readdirSync(LIBS_METHODOLOGIES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) =>
      fs.existsSync(
        path.join(
          LIBS_METHODOLOGIES,
          name,
          'rules',
          'src',
          'methodology-application.config.ts',
        ),
      ),
    );
}

function loadMethodologyApplicationConfig(
  methodology: string,
): MethodologyApplicationConfig {
  const configPath = path.join(
    LIBS_METHODOLOGIES,
    methodology,
    'rules',
    'src',
    'methodology-application.config.ts',
  );

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { methodologyApplicationConfig } = require(configPath) as {
    methodologyApplicationConfig: MethodologyApplicationConfig;
  };

  return methodologyApplicationConfig;
}

// ---------------------------------------------------------------------------
// Methodology framework rules
// ---------------------------------------------------------------------------

const BaseMethodologyFrameworkRuleSchema = z.object({
  description: z.string().min(1),
  methodologyReference: z.string().min(1).optional(),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/),
  type: z.enum(METHODOLOGY_FRAMEWORK_RULE_TYPES),
});

function loadMethodologyFrameworkRules(
  methodology: string,
): BaseMethodologyFrameworkRule[] {
  const filePath = path.join(
    LIBS_METHODOLOGIES,
    methodology,
    'rules',
    'src',
    'methodology-framework-rules.ts',
  );

  if (!fileExists(filePath)) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { methodologyFrameworkRules } = require(filePath) as {
    methodologyFrameworkRules: BaseMethodologyFrameworkRule[];
  };

  for (const rule of methodologyFrameworkRules) {
    BaseMethodologyFrameworkRuleSchema.parse(rule);
  }

  // Duplicate slug check
  const slugs = new Set<string>();
  for (const rule of methodologyFrameworkRules) {
    if (slugs.has(rule.slug)) {
      throw new Error(
        `FATAL: Duplicate methodology framework rule slug "${rule.slug}" in ${methodology}`,
      );
    }
    slugs.add(rule.slug);
  }

  return methodologyFrameworkRules;
}

function getMethodologyFrameworkRuleSlugs(
  rules: BaseMethodologyFrameworkRule[],
): Set<string> {
  return new Set(rules.map((r) => r.slug));
}

// ---------------------------------------------------------------------------
// Application rules config (rulesConfig)
// ---------------------------------------------------------------------------

function getRulesConfigPath(methodology: string): string | undefined {
  const libPath = path.join(
    LIBS_METHODOLOGIES,
    methodology,
    'rules',
    'src',
    'rules.config.ts',
  );
  if (fileExists(libPath)) return libPath;

  const appPath = path.join(
    APPS_METHODOLOGIES,
    methodology,
    'rules.config.ts',
  );
  if (fileExists(appPath)) return appPath;

  return undefined;
}

function loadRulesConfig(
  methodology: string,
): Record<string, readonly string[]> | undefined {
  const configPath = getRulesConfigPath(methodology);
  if (!configPath) return undefined;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { rulesConfig } = require(configPath) as {
    rulesConfig: Record<string, readonly string[]>;
  };
  return rulesConfig;
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Enum resolution (required for event name resolution & message normalization)
// ---------------------------------------------------------------------------

type StringEnum = Record<string, string>;

function enumKeyToValueMap(enumObj: StringEnum): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, value] of Object.entries(enumObj)) {
    if (typeof value === 'string') {
      map[key] = value;
    }
  }
  return map;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BoldTypes = require(
  '@carrot-fndn/shared/methodologies/bold/types',
) as {
  DocumentCategory: StringEnum;
  DocumentEventAttributeName: StringEnum;
  DocumentEventAttributeValue: StringEnum;
  DocumentEventName: StringEnum;
  DocumentEventVehicleType: StringEnum;
  DocumentType: StringEnum;
  MeasurementUnit: StringEnum;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SharedTypes = require('@carrot-fndn/shared/types') as {
  MethodologyDocumentEventAttributeFormat: StringEnum;
  MethodologyDocumentEventLabel: StringEnum;
};

const ENUM_KEY_TO_VALUE: Record<string, string> = {
  ...enumKeyToValueMap(BoldTypes.DocumentCategory),
  ...enumKeyToValueMap(BoldTypes.DocumentType),
  ...enumKeyToValueMap(BoldTypes.DocumentEventName),
  ...enumKeyToValueMap(BoldTypes.DocumentEventAttributeName),
  ...enumKeyToValueMap(SharedTypes.MethodologyDocumentEventLabel),
  ...enumKeyToValueMap(SharedTypes.MethodologyDocumentEventAttributeFormat),
  ...enumKeyToValueMap(BoldTypes.DocumentEventAttributeValue),
  ...enumKeyToValueMap(BoldTypes.DocumentEventVehicleType),
  ...enumKeyToValueMap(BoldTypes.MeasurementUnit),
};

const DocumentEventName = BoldTypes.DocumentEventName;
const MethodologyDocumentEventLabel =
  SharedTypes.MethodologyDocumentEventLabel;

// ---------------------------------------------------------------------------
// Actor label extraction from processor files
// ---------------------------------------------------------------------------

function extractActorLabelsFromProcessor(processorPath: string): string[] {
  const content = fs.readFileSync(processorPath, 'utf8');
  const labels = new Set<string>();

  const labelIsAnyOfRe = /eventLabelIsAnyOf\(\[([^\]]+)\]/g;
  let match;
  while ((match = labelIsAnyOfRe.exec(content)) !== null) {
    const inner = match[1] ?? '';
    for (const token of inner.split(',')) {
      const trimmed = token.trim();
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

  const hasLabelRe =
    /eventHasLabel\(\w+,\s*(?:MethodologyDocumentEventLabel\.)?([A-Z_]+)\)/g;
  while ((match = hasLabelRe.exec(content)) !== null) {
    if (match[1]) {
      labels.add(match[1]);
    }
  }

  return [...labels]
    .sort()
    .map((key) => MethodologyDocumentEventLabel[key] ?? key);
}

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

// ---------------------------------------------------------------------------
// Rule definition extraction
// ---------------------------------------------------------------------------

interface RuleDefinitionData {
  description: string;
  events: string[];
  methodologyFrameworkRules: string[];
  name: string;
  slug: string;
  version: string;
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
  const versionMatch = content.match(/version:\s*['"`]([^'"`]+)['"`]/);

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

  // Extract methodologyFrameworkRules array
  const fwMatch = content.match(/methodologyFrameworkRules:\s*\[([\s\S]*?)\]/);
  const methodologyFrameworkRules: string[] = [];
  if (fwMatch?.[1]) {
    const strMatches = fwMatch[1].matchAll(/['"`]([^'"`]+)['"`]/g);
    for (const m of strMatches) {
      if (m[1]) methodologyFrameworkRules.push(m[1]);
    }
  }

  return {
    description: descMatch?.[1]?.trim() ?? '',
    events,
    methodologyFrameworkRules,
    name: nameMatch?.[1] ?? libSlug,
    slug: slugMatch?.[1] ?? libSlug,
    version: versionMatch?.[1] ?? '0.0.0',
  };
}

// ---------------------------------------------------------------------------
// App-level methodologyFrameworkRules extraction
// ---------------------------------------------------------------------------

function extractAppMethodologyFrameworkRules(
  appRulePath: string,
): string[] | undefined {
  const ruleDefPath = path.join(appRulePath, 'src', 'rule-definition.ts');

  if (!fileExists(ruleDefPath)) return undefined;

  const content = fs.readFileSync(ruleDefPath, 'utf8');
  const fwMatch = content.match(/methodologyFrameworkRules:\s*\[([\s\S]*?)\]/);

  if (!fwMatch?.[1]) return [];

  const rules: string[] = [];
  const strMatches = fwMatch[1].matchAll(/['"`]([^'"`]+)['"`]/g);

  for (const m of strMatches) {
    if (m[1]) rules.push(m[1]);
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Error messages extraction
// ---------------------------------------------------------------------------

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

  const assignMatch = content.match(/ERROR_MESSAGES?\s*=\s*\{/);
  if (!assignMatch || assignMatch.index === undefined) return { byKey, values };

  const braceStart = (assignMatch.index ?? 0) + assignMatch[0].length - 1;
  const { end: braceEnd } = findEnclosingObjectBounds(content, braceStart + 1);
  const inner = content.slice(braceStart + 1, braceEnd - 1);

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

// ---------------------------------------------------------------------------
// Result comments extraction
// ---------------------------------------------------------------------------

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

  let passed = extractNestedStrings(content, 'passed');
  let failed = extractNestedStrings(content, 'failed');

  if (content.includes('PASSED_RESULT_COMMENTS')) {
    const passedInner = extractExportedObjectInner(
      content,
      'PASSED_RESULT_COMMENTS',
    );
    if (passedInner) {
      const fromPassed = extractFromObjectInner(passedInner);
      passed = {
        values: [...passed.values, ...fromPassed.values],
        byKey: { ...passed.byKey, ...fromPassed.byKey },
      };
    }
    const failedSources = [
      'INVALID_RESULT_COMMENTS',
      'WRONG_FORMAT_RESULT_COMMENTS',
      'NOT_FOUND_RESULT_COMMENTS',
    ];
    for (const name of failedSources) {
      const failedInner = extractExportedObjectInner(content, name);
      if (failedInner) {
        const fromFailed = extractFromObjectInner(failedInner);
        failed = {
          values: [...failed.values, ...fromFailed.values],
          byKey: { ...failed.byKey, ...fromFailed.byKey },
        };
      }
    }
  }

  if (content.includes('CROSS_VALIDATION_COMMENTS')) {
    const resultCommentsInner = extractExportedObjectInner(
      content,
      'RESULT_COMMENTS',
    );
    if (resultCommentsInner) {
      const fromResult = extractFromObjectInner(resultCommentsInner);
      const passedKeys = new Set(
        Object.keys(fromResult.byKey).filter((k) =>
          k.startsWith('VALID_'),
        ),
      );
      const passedFromFlat: string[] = [];
      const failedFromFlat: string[] = [];
      for (const v of fromResult.values) {
        const key = Object.entries(fromResult.byKey).find(
          ([, msg]) => msg === v,
        )?.[0];
        if (key && passedKeys.has(key)) passedFromFlat.push(v);
        else failedFromFlat.push(v);
      }
      passed = {
        values: [...passed.values, ...passedFromFlat],
        byKey: {
          ...passed.byKey,
          ...Object.fromEntries(
            Object.entries(fromResult.byKey).filter(([k]) =>
              passedKeys.has(k),
            ),
          ),
        },
      };
      failed = {
        values: [...failed.values, ...failedFromFlat],
        byKey: {
          ...failed.byKey,
          ...Object.fromEntries(
            Object.entries(fromResult.byKey).filter(
              ([k]) => !passedKeys.has(k),
            ),
          ),
        },
      };
    }
    const crossInner = extractExportedObjectInner(
      content,
      'CROSS_VALIDATION_COMMENTS',
    );
    if (crossInner) {
      const fromCross = extractFromObjectInner(crossInner);
      failed = {
        values: [...failed.values, ...fromCross.values],
        byKey: { ...failed.byKey, ...fromCross.byKey },
      };
    }
  }

  return {
    failed: failed.values,
    failedByKey: failed.byKey,
    passed: passed.values,
    passedByKey: passed.byKey,
  };
}

function extractExportedObjectInner(
  content: string,
  objectName: string,
): string | undefined {
  const re = new RegExp(
    `(?:export\\s+)?const\\s+${objectName}\\s*=\\s*\\{`,
    'g',
  );
  const match = re.exec(content);
  if (!match || match.index === undefined) return undefined;
  const braceStart = match.index + match[0].length - 1;
  const bounds = findEnclosingObjectBounds(content, braceStart + 1);
  return content.slice(bounds.start + 1, bounds.end - 1);
}

interface NestedStringsResult {
  byKey: Record<string, string>;
  values: string[];
}

function extractFromObjectInner(inner: string): NestedStringsResult {
  const values: string[] = [];
  const byKey: Record<string, string> = {};

  const keyedTemplateRe = /(\w+)\s*:\s*`([^`]*)`/g;
  let match: RegExpExecArray | null;
  while ((match = keyedTemplateRe.exec(inner)) !== null) {
    const key = match[1] ?? '';
    const msg = normalizeMessage(match[2]?.trim() ?? '');
    if (msg && msg.length > 5) {
      byKey[key] = msg;
      if (!values.includes(msg)) values.push(msg);
    }
  }

  const keyedArrowTemplateRe =
    /(\w+)\s*:\s*\([^)]*\)(?:\s*:\s*\w+)?\s*=>\s*`([^`]*)`/g;
  while ((match = keyedArrowTemplateRe.exec(inner)) !== null) {
    const key = match[1] ?? '';
    const msg = normalizeMessage(match[2]?.trim() ?? '');
    if (msg && msg.length > 5 && !byKey[key]) {
      byKey[key] = msg;
      if (!values.includes(msg)) values.push(msg);
    }
  }

  const keyedStringRe = /(\w+)\s*:\s*['"]([^'"]{5,})['"]/g;
  while ((match = keyedStringRe.exec(inner)) !== null) {
    const key = match[1] ?? '';
    const msg = match[2]?.trim() ?? '';
    if (msg) {
      if (!byKey[key]) byKey[key] = msg;
      if (!values.includes(msg)) values.push(msg);
    }
  }

  return { byKey, values };
}

function extractNestedStrings(
  content: string,
  section: string,
): NestedStringsResult {
  const values: string[] = [];
  const byKey: Record<string, string> = {};

  const sectionRe = new RegExp(
    `${section}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`,
    'm',
  );
  const sectionMatch = content.match(sectionRe);
  if (!sectionMatch?.[1]) return { byKey, values };

  const inner = sectionMatch[1];

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

  const keyedArrowTemplateRe =
    /(\w+)\s*:\s*\([^)]*\)(?:\s*:\s*\w+)?\s*=>\s*`([^`]*)`/g;
  while ((match = keyedArrowTemplateRe.exec(inner)) !== null) {
    const key = match[1] ?? '';
    const msg = normalizeMessage(match[2]?.trim() ?? '');
    if (msg && msg.length > 5 && !byKey[key]) {
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

// ---------------------------------------------------------------------------
// Message normalization
// ---------------------------------------------------------------------------

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

const PARAMETER_PLACEHOLDERS = new Set(['VEHICLE_TYPE']);

function resolveEnumPlaceholders(message: string): string {
  return message.replace(/\{\{([A-Z_]+)\}\}/g, (_match, key: string) => {
    if (PARAMETER_PLACEHOLDERS.has(key)) return `{{${key}}}`;
    return ENUM_KEY_TO_VALUE[key] ?? `{{${key}}}`;
  });
}

function normalizeMessage(str: string): string {
  if (!str) return str;

  const withPlaceholders = str
    .replace(/\$\{String\((\w+)\)\}/g, (_match, inner: string) => {
      return `{{${resolvePlaceholder(inner)}}}`;
    })
    .replace(/\$\{([^}]+)\}/g, (_match, inner: string) => {
      const ident = inner.split(/[.([\]]/)[0]?.trim() ?? '';
      return `{{${resolvePlaceholder(ident)}}}`;
    })
    .replace(/\\"/g, '"');

  const result = resolveEnumPlaceholders(withPlaceholders);
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

const DOCUMENT_TYPE_DISPLAY_NAMES = [
  ...new Set([
    ...Object.values(BoldTypes.DocumentCategory),
    ...Object.values(BoldTypes.DocumentType),
  ]),
].sort((a, b) => b.length - a.length);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function quoteUnquotedDocumentTypeNames(message: string): string {
  let result = message;
  for (const name of DOCUMENT_TYPE_DISPLAY_NAMES) {
    const escaped = escapeRegex(name);
    const re = new RegExp(`(^|[^"])(${escaped})([^"]|$)`, 'g');
    result = result.replace(re, '$1"$2"$3');
  }
  return result;
}

function normalizeMessages(messages: string[]): string[] {
  return messages
    .map((s) => normalizeMessage(s))
    .map(quoteUnquotedDocumentTypeNames)
    .filter((s) => !isPlaceholderOnly(s) && !isCodeLeak(s));
}

// ---------------------------------------------------------------------------
// Brace-balanced object extraction
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// README extraction
// ---------------------------------------------------------------------------

interface ReadmeData {
  description: string;
  name: string;
}

function extractReadmeData(readmePath: string): ReadmeData {
  const result: ReadmeData = { description: '', name: '' };

  const content = readFileIfExists(readmePath);
  if (!content) return result;

  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch?.[1]) {
    result.name = titleMatch[1].trim();
  }

  const descMatch = content.match(
    /##\s+(?:📄\s+)?Description\s*\n\n(.+?)(?:\n\n|\n##)/s,
  );
  if (descMatch?.[1]) {
    result.description = descMatch[1].trim();
  }

  return result;
}

// ---------------------------------------------------------------------------
// Application rule builder
// ---------------------------------------------------------------------------

interface ApplicationManifestRule {
  description: string;
  errors: string[];
  events: string[];
  implementationPath: string;
  implementsMethodologyFrameworkRules: string[];
  name: string;
  readmePath: string;
  slug: string;
  successComments: string[];
  version: string;
}

function buildApplicationRule(
  methodology: string,
  scope: string,
  slug: string,
  validFrameworkSlugs: Set<string>,
): ApplicationManifestRule {
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

  const libSlug = SLUG_TO_LIB[slug] ?? slug;
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

  // Extract data
  const ruleDef = extractRuleDefinition(libSrcPath, srcFiles, slug);
  const readme = extractReadmeData(readmePath);
  const errorMessages = extractErrorMessages(libSrcPath, srcFiles);
  const resultComments = extractResultComments(libSrcPath, srcFiles);

  // Enrich events
  const actorLabels = extractActorLabelsFromProcessor(processorFullPath);
  const events = enrichActorEvents(ruleDef?.events ?? [], actorLabels);

  // Resolve methodologyFrameworkRules: prefer app-level, fall back to shared lib
  const appRuleMethodologyFrameworkRules =
    extractAppMethodologyFrameworkRules(appRulePath);
  const methodologyFrameworkRules =
    appRuleMethodologyFrameworkRules ??
    ruleDef?.methodologyFrameworkRules ??
    [];

  // Validate framework rule slugs
  const invalidSlugs = methodologyFrameworkRules.filter(
    (s) => !validFrameworkSlugs.has(s),
  );
  if (invalidSlugs.length > 0) {
    throw new Error(
      `Invalid methodology framework rule slug(s) [${invalidSlugs.join(', ')}] in ${methodology}/${scope}/${slug}. ` +
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

  // Merge errors
  const allErrors = [...errorMessages.values];
  for (const msg of resultComments.failed) {
    if (!allErrors.includes(msg)) {
      allErrors.push(msg);
    }
  }

  return {
    description,
    errors: normalizeMessages(allErrors),
    events,
    implementationPath: relImplementationPath,
    implementsMethodologyFrameworkRules: methodologyFrameworkRules,
    name,
    readmePath: relReadmePath,
    slug,
    successComments: normalizeMessages(resultComments.passed),
    version: ruleDef?.version ?? '0.0.0',
  };
}

// ---------------------------------------------------------------------------
// Manifest types
// ---------------------------------------------------------------------------

interface FrameworkManifestRule {
  description: string;
  methodologyReference?: string;
  name: string;
  slug: string;
  type: string;
}

interface ApplicationRulesBlock {
  rules: Record<string, ApplicationManifestRule[]>;
  version: string;
}

interface FrameworkBlock {
  applications: Record<string, ApplicationRulesBlock>;
  displayName: string;
  rules: FrameworkManifestRule[];
  version: string;
}

interface UnifiedManifest {
  frameworks: Record<string, FrameworkBlock>;
  generatedAt: string;
  sourceCommit: string;
  version: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function generate(): void {
  const methodologies = discoverMethodologies();

  if (methodologies.length === 0) {
    console.error(
      `FATAL: No methodology directories with methodology-application.config.ts found under ${LIBS_METHODOLOGIES}`,
    );
    process.exit(1);
  }

  const manifest: UnifiedManifest = {
    frameworks: {},
    generatedAt: new Date().toISOString(),
    sourceCommit: getSourceCommit(),
    version: MANIFEST_SCHEMA_VERSION,
  };

  let totalApplicationRules = 0;
  const warnings: string[] = [];

  for (const methodology of methodologies) {
    const config = loadMethodologyApplicationConfig(methodology);
    const frameworkRules = loadMethodologyFrameworkRules(methodology);
    const frameworkSlugs = getMethodologyFrameworkRuleSlugs(frameworkRules);
    const rulesConfig = loadRulesConfig(methodology);

    if (frameworkRules.length === 0) {
      console.warn(
        `Warning: Methodology "${methodology}" has no methodology framework rules`,
      );
    }

    // Build the framework rules array
    const manifestFrameworkRules: FrameworkManifestRule[] = frameworkRules.map(
      (rule) => ({
        description: rule.description,
        name: rule.name,
        slug: rule.slug,
        type: rule.type,
        ...(rule.methodologyReference !== undefined && {
          methodologyReference: rule.methodologyReference,
        }),
      }),
    );

    // Build application rules (scoped by scope name like mass-id, credit-order, etc.)
    const applicationRules: Record<string, ApplicationManifestRule[]> = {};

    if (rulesConfig) {
      for (const [scope, slugs] of Object.entries(rulesConfig)) {
        const scopeRules: ApplicationManifestRule[] = [];

        for (const slug of slugs) {
          try {
            const rule = buildApplicationRule(
              methodology,
              scope,
              slug,
              frameworkSlugs,
            );
            scopeRules.push(rule);
            totalApplicationRules++;

            if (rule.errors.length === 0) {
              warnings.push(
                `${methodology}/${scope}/${slug}: no errors extracted`,
              );
            }
          } catch (error) {
            console.error(
              `Error processing ${methodology}/${scope}/${slug}: ${error}`,
            );
            process.exit(1);
          }
        }

        applicationRules[scope] = scopeRules;
      }
    }

    // Assemble the framework block
    manifest.frameworks[methodology] = {
      applications: {
        [methodology]: {
          rules: applicationRules,
          version: config.version,
        },
      },
      displayName: config.displayName,
      rules: manifestFrameworkRules,
      version: config.methodologyFrameworkVersion,
    };
  }

  // Write output
  if (!dirExists(DIST)) {
    fs.mkdirSync(DIST, { recursive: true });
  }

  const outputPath = path.join(DIST, 'methodology-rules-manifest.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // Summary
  console.log('Generated methodology-rules-manifest.json');
  console.log(`  Manifest schema version: ${MANIFEST_SCHEMA_VERSION}`);
  console.log(`  Commit: ${manifest.sourceCommit.slice(0, 7)}`);
  console.log(`  Frameworks: ${Object.keys(manifest.frameworks).length}`);
  for (const [fw, block] of Object.entries(manifest.frameworks)) {
    console.log(
      `    ${fw}: ${block.rules.length} framework rules, ${
        Object.values(block.applications).reduce(
          (sum, app) =>
            sum +
            Object.values(app.rules).reduce(
              (s, arr) => s + arr.length,
              0,
            ),
          0,
        )
      } application rules`,
    );
  }
  console.log(`  Total application rules: ${totalApplicationRules}`);

  if (warnings.length > 0) {
    console.log(`  Warnings: ${warnings.length}`);
    for (const warning of warnings) {
      console.log(`    - ${warning}`);
    }
  }
}

generate();
