#!/usr/bin/env tsx

/**
 * Generates per-methodology framework-rules manifests — the cross-repo contract
 * between methodology-rules and carrot-docs.
 *
 * Usage: pnpm generate:framework-rules
 * Output: dist/framework-rules/bold-carbon.json, dist/framework-rules/bold-recycling.json
 */

import type { BaseFrameworkRule } from '@carrot-fndn/shared/rule/types';

import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const DIST_FRAMEWORK = path.join(ROOT, 'dist', 'framework-rules');
const LIBS_METHODOLOGIES = path.join(ROOT, 'libs', 'methodologies');

// Auto-discover methodologies that have framework-rules.ts
const METHODOLOGY_DIRS = fs
  .readdirSync(LIBS_METHODOLOGIES, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((name) =>
    fs.existsSync(
      path.join(LIBS_METHODOLOGIES, name, 'rules', 'src', 'framework-rules.ts'),
    ),
  );

if (METHODOLOGY_DIRS.length === 0) {
  console.error(
    `FATAL: No methodology directories with framework-rules.ts found under ${LIBS_METHODOLOGIES}`,
  );
  process.exit(1);
}

function loadFrameworkRules(methodology: string): BaseFrameworkRule[] {
  const filePath = path.join(
    LIBS_METHODOLOGIES,
    methodology,
    'rules',
    'src',
    'framework-rules.ts',
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { frameworkRules } = require(filePath) as {
    frameworkRules: BaseFrameworkRule[];
  };
  return frameworkRules;
}

function main(): void {
  fs.mkdirSync(DIST_FRAMEWORK, { recursive: true });

  for (const methodology of METHODOLOGY_DIRS) {
    const rules = loadFrameworkRules(methodology);

    if (rules.length === 0) {
      console.error(
        `FATAL: Methodology "${methodology}" has an empty frameworkRules array`,
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
        ...(rule.methodologyReference && {
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
