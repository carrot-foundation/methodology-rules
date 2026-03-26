#!/usr/bin/env tsx

/**
 * Generates per-methodology framework-rules manifests — the cross-repo contract
 * between methodology-rules and carrot-docs.
 *
 * Usage: pnpm generate:methodology-framework-rules
 * Output: dist/methodology-framework-rules/bold-carbon.json, dist/methodology-framework-rules/bold-recycling.json
 */

import type { BaseMethodologyFrameworkRule } from '@carrot-fndn/shared/rule/types';
import { METHODOLOGY_FRAMEWORK_RULE_TYPES } from '../libs/shared/rule/types/src/methodology-framework-rule.types';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';

const ROOT = path.resolve(__dirname, '..');
const DIST_FRAMEWORK = path.join(ROOT, 'dist', 'methodology-framework-rules');
const LIBS_METHODOLOGIES = path.join(ROOT, 'libs', 'methodologies');

// Auto-discover methodologies that have methodology-framework-rules.ts
const METHODOLOGY_DIRS = fs
  .readdirSync(LIBS_METHODOLOGIES, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((name) =>
    fs.existsSync(
      path.join(LIBS_METHODOLOGIES, name, 'rules', 'src', 'methodology-framework-rules.ts'),
    ),
  );

if (METHODOLOGY_DIRS.length === 0) {
  console.error(
    `FATAL: No methodology directories with methodology-framework-rules.ts found under ${LIBS_METHODOLOGIES}`,
  );
  process.exit(1);
}

const BaseMethodologyFrameworkRuleSchema = z.object({
  description: z.string().min(1),
  methodologyReference: z.string().min(1).optional(),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/),
  type: z.enum(METHODOLOGY_FRAMEWORK_RULE_TYPES),
});

function loadMethodologyFrameworkRules(methodology: string): BaseMethodologyFrameworkRule[] {
  const filePath = path.join(
    LIBS_METHODOLOGIES,
    methodology,
    'rules',
    'src',
    'methodology-framework-rules.ts',
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { methodologyFrameworkRules } = require(filePath) as {
    methodologyFrameworkRules: BaseMethodologyFrameworkRule[];
  };

  // Validate each rule against the schema
  for (const rule of methodologyFrameworkRules) {
    BaseMethodologyFrameworkRuleSchema.parse(rule);
  }

  // Check for duplicate slugs
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

function main(): void {
  fs.mkdirSync(DIST_FRAMEWORK, { recursive: true });

  for (const methodology of METHODOLOGY_DIRS) {
    const rules = loadMethodologyFrameworkRules(methodology);

    if (rules.length === 0) {
      console.error(
        `FATAL: Methodology "${methodology}" has an empty methodologyFrameworkRules array`,
      );
      process.exit(1);
    }

    const manifest = {
      version: '1.0.0',
      methodology,
      rules: rules.map((rule, index) => ({
        slug: rule.slug,
        name: rule.name,
        number: index + 1,
        description: rule.description,
        type: rule.type,
        ...(rule.methodologyReference !== undefined && {
          methodologyReference: rule.methodologyReference,
        }),
      })),
    };

    const outPath = path.join(DIST_FRAMEWORK, `${methodology}.json`);
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Wrote ${outPath} (${manifest.rules.length} rules)`);
  }
}

main();
