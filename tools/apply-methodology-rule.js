#!/usr/bin/env node

/**
 * Methodology Rule Application
 *
 * This script applies an existing rule from @rule-processors to a specific bold methodology.
 * It copies the rule structure from the source to the target methodology.
 *
 * Usage:
 *   pnpm apply-methodology-rule <methodology-name> <rule-name> <scope>
 *
 * Example:
 *   pnpm apply-methodology-rule carbon geolocation-precision mass-id
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const methodologyName = process.argv[2];
const ruleName = process.argv[3];
const scope = process.argv[4];

// Check for required arguments and help flag
if (
  !methodologyName ||
  !ruleName ||
  !scope ||
  methodologyName === '--help' ||
  methodologyName === '-h'
) {
  console.log(`
Methodology Rule Application

Usage: apply-methodology-rule <methodology-name> <rule-name> <scope>

Arguments:
  methodology-name  The name of the bold methodology (e.g., carbon, recycling)
  rule-name         The name of the rule to apply (must exist in @rule-processors)
  scope             The scope of the rule (e.g., mass-id)

Example:
  apply-methodology-rule carbon geolocation-precision mass-id
  `);
  process.exit(0);
}

// Define source and target directories
const sourceRoot = `libs/methodologies/bold/rule-processors/${scope}`;
const sourceDirectory = path.join(sourceRoot, 'src', ruleName);
const targetRoot = `apps/methodologies/bold-${methodologyName}/rule-processors/${scope}`;
const targetDirectory = path.join(targetRoot, ruleName);
const targetSrcDirectory = path.join(targetDirectory, 'src');

// Convert rule name to different formats for template replacements
const camelCase = ruleName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
const pascalCase = camelCase.charAt(0).toUpperCase() + camelCase.slice(1);

// Check if source directory exists
if (!fs.existsSync(sourceDirectory)) {
  console.error(
    `Error: Source rule '${ruleName}' does not exist in '${sourceRoot}'.`,
  );
  process.exit(1);
}

// Check if methodology application exists
const methodologyPath = `apps/methodologies/bold-${methodologyName}`;
if (!fs.existsSync(methodologyPath)) {
  console.error(
    `Error: Methodology application 'bold-${methodologyName}' does not exist.`,
  );
  process.exit(1);
}

// Check if target directory already exists
if (fs.existsSync(targetDirectory)) {
  console.error(
    `Error: Directory for rule '${ruleName}' already exists in '${targetRoot}'. Use a different name or remove existing directory.`,
  );
  process.exit(1);
}

// Create target directory structure if it doesn't exist
try {
  fs.mkdirSync(targetSrcDirectory, { recursive: true });
  console.log(`Created directory ${targetSrcDirectory}`);
} catch (error) {
  console.error(
    `Error creating directory ${targetSrcDirectory}: ${error.message}`,
  );
  process.exit(1);
}

// Generated timestamp for file headers
const timestamp = new Date().toISOString();
const generatedComment = `/**
 * GENERATED FILE - DO NOT MODIFY DIRECTLY
 * Applied from source rule: ${sourceDirectory}
 * Generated on: ${timestamp}
 */\n\n`;

// Project configuration files templates
const projectFiles = [
  {
    name: '.eslintrc.js',
    content: `const {
  getBaseEslintConfig,
} = require('../../../../../../.eslint/eslint.config');

module.exports = getBaseEslintConfig({
  projectPath: __dirname,
});
`,
  },
  {
    name: 'README.md',
    content: `<div align="center">

# ${pascalCase}

Methodology: **BOLD-${methodologyName.toUpperCase()}**

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/carrot-foundation/methodology-rules/check-and-deploy.yaml)](https://github.com/carrot-foundation/smaug/actions)

</div>

## 📄 Description

<!-- TODO: Update README rule descriptions -->

## 📂 Implementation

- **[Main Implementation File](https://github.com/carrot-foundation/methodology-rules/tree/main/libs/methodologies/bold/rule-processors/${scope}/src/${ruleName}/${ruleName}.processor.ts)**

## 👥 Contributors

[![AMarcosCastelo](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/43973049?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/AMarcosCastelo)
[![andtankian](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/12521890?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/andtankian)
[![cris-santos](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/7927374?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/cris-santos)
[![gabrielsl96](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/49005645?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/gabrielsl96)
[![GLGuilherme](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/26340386?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/GLGuilherme)
[![sangalli](https://images.weserv.nl/?url=avatars.githubusercontent.com/u/11515359?v=4&h=60&w=60&fit=cover&mask=circle&maxage=7d)](https://github.com/sangalli)

## 🔑 License

[License](https://github.com/carrot-foundation/methodology-rules/blob/main/LICENSE)
`,
  },
  {
    name: 'jest.config.ts',
    content: `import { getJestBaseConfig } from '../../../../../../.jest/config/jest.base.config';

export default getJestBaseConfig(__dirname);
`,
  },
  {
    name: 'package.json',
    content: `{
  "name": "@carrot-fndn/methodologies/bold-${methodologyName}/rule-processors/${scope}/${ruleName}",
  "version": "0.0.0"
}
`,
  },
  {
    name: 'project.json',
    content: `{
  "name": "methodologies-bold-${methodologyName}-rule-processors-${scope}-${ruleName}",
  "$schema": "../../../../../../node_modules/nx/schemas/project-schema.json",
  "tags": ["methodology:bold", "processor:${scope}", "type:app"],
  "sourceRoot": "apps/methodologies/bold-${methodologyName}/rule-processors/${scope}/${ruleName}/src",
  "projectType": "application",
  "targets": {
    "build-lambda": {},
    "lint": {},
    "package-lambda": {},
    "upload-lambda": {},
    "ts": {}
  }
}
`,
  },
  {
    name: 'tsconfig.build.json',
    content: `{
  "extends": [
    "./tsconfig.json",
    "../../../../../../.tsconfig/tsconfig.build.json"
  ]
}
`,
  },
  {
    name: 'tsconfig.eslint.json',
    content: `{
  "extends": "./tsconfig.json",
  "include": ["**/*.ts"]
}
`,
  },
  {
    name: 'tsconfig.json',
    content: `{
  "extends": "../../../../../../tsconfig.base.json",
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.eslint.json"
    }
  ]
}
`,
  },
  {
    name: 'tsconfig.spec.json',
    content: `{
  "extends": "../../../../../../.tsconfig/tsconfig.spec.json"
}
`,
  },
  {
    name: 'src/lambda.ts',
    content: `import { ${camelCase}Lambda } from '@carrot-fndn/methodologies/bold/rule-processors/${scope}';

export const handler = ${camelCase}Lambda;
`,
  },
];

// Create project files
projectFiles.forEach((file) => {
  try {
    const filePath = path.join(targetDirectory, file.name);
    fs.writeFileSync(filePath, file.content);
    console.log(`Created ${filePath}`);
  } catch (error) {
    console.error(`Error creating file ${file.name}: ${error.message}`);
    process.exit(1);
  }
});

// Copy rule source files to the methodology application
// This is kept for reference, but we don't need to copy these files
// as we're importing them from the source library

console.log(
  `\nSuccessfully applied rule '${ruleName}' to methodology 'bold-${methodologyName}'.`,
);
console.log(`\nNext steps:`);
console.log(
  `1. Verify the lambda implementation in ${targetSrcDirectory}/lambda.ts`,
);
console.log(`2. Ensure the rule is properly imported from the source library`);
console.log(`3. Run tests with: pnpm test ${targetRoot}`);
