#!/usr/bin/env node

/**
 * Rule Generator
 *
 * This script generates a new rule with all necessary files and structure.
 * It creates the following files in the rule's directory:
 * - index.ts - Exports the rule's lambda handler
 * - [rule-name].lambda.ts - Lambda handler wrapper
 * - [rule-name].processor.ts - Main rule processor implementation
 * - [rule-name].errors.ts - Error message definitions
 * - [rule-name].processor.spec.ts - Unit tests
 * - [rule-name].test-cases.ts - Test case definitions
 * - [rule-name].lambda.e2e.spec.ts - End-to-end tests
 *
 * The script will also update the scope's main index.ts to export the new rule.
 *
 * Usage:
 *   pnpm create-rule <rule-name> [scope] [description]
 *
 * Arguments:
 *   rule-name    The name of the rule (required, kebab-case)
 *   scope        The scope/domain of the rule (optional, defaults to 'mass-id')
 *   description  A brief description of what the rule validates (optional)
 *
 * Examples:
 *   pnpm create-rule vehicle-definition mass-id "Validates the vehicle definition in the mass-id document"
 *   pnpm create-rule credit-allocation credit "Validates the credit allocation process"
 *
 * The rule will be created under libs/methodologies/bold/rule-processors/[scope]/src/[rule-name]/
 */

const fs = require('fs');
const path = require('path');

// Get the rule name from command line arguments
const ruleName = process.argv[2];

// Check for help flag
if (
  !ruleName ||
  ruleName.trim() === '' ||
  ruleName === '--help' ||
  ruleName === '-h'
) {
  console.log(`
Rule Generator

Usage: create-rule <rule-name> [scope] [description]

Arguments:
  rule-name    The name of the rule (required)
  scope        The scope/domain of the rule (defaults to 'mass-id')
  description  A brief description of the rule (optional)

Examples:
  create-rule vehicle-definition mass-id "Validates the vehicle definition in the mass-id document"
  create-rule credit-allocation credit "Validates the credit allocation process"
  `);
  process.exit(0);
}

// Get the scope (default to 'mass-id' if not provided)
const scope =
  process.argv[3] && !process.argv[3].startsWith('"')
    ? process.argv[3]
    : 'mass-id';

// Get the description (adjust based on whether scope was provided)
const description =
  process.argv[3] && process.argv[3].startsWith('"')
    ? process.argv[3]
    : process.argv[4] || 'The rule validation is compliant.';

// Convert rule name to different formats
const camelCase = ruleName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
const pascalCase = camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
const fileName = ruleName;

// Define the target directory
const projectRoot = `libs/methodologies/bold/rule-processors/${scope}`;
const targetDirectory = path.join(projectRoot, 'src', ruleName);

// Define the template files
const templates = [
  {
    name: 'index.ts',
    content: `export * from './${fileName}.lambda';\n`,
  },
  {
    name: `${fileName}.lambda.ts`,
    content: `import { wrapRuleIntoLambdaHandler } from '@carrot-fndn/shared/lambda/wrapper';

import { ${pascalCase}Processor } from './${fileName}.processor';

const instance = new ${pascalCase}Processor();

export const ${camelCase}Lambda = wrapRuleIntoLambdaHandler(instance);\n`,
  },
  {
    name: `${fileName}.processor.ts`,
    content: `import type { EvaluateResultOutput } from '@carrot-fndn/shared/rule/standard-data-processor';

import { isNil } from '@carrot-fndn/shared/helpers';
import { ParentDocumentRuleProcessor } from '@carrot-fndn/shared/methodologies/bold/processors';
import { type Document } from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { ${pascalCase}ProcessorErrors } from './${fileName}.errors';

export const RESULT_COMMENTS = {
  PASSED: '${description}',
  FAILED: 'The rule validation failed.',
} as const;

export class ${pascalCase}Processor extends ParentDocumentRuleProcessor<Document> {
  protected readonly processorErrors = new ${pascalCase}ProcessorErrors();

  private get RESULT_COMMENT() {
    return RESULT_COMMENTS;
  }

  private validateRequiredFields(
    document: Document,
  ): EvaluateResultOutput | undefined {
    if (isNil(document.type)) {
      return {
        resultComment:
          this.processorErrors.ERROR_MESSAGE.DOCUMENT_TYPE_NOT_FOUND,
        resultStatus: RuleOutputStatus.FAILED,
      };
    }

    return undefined;
  }

  protected override evaluateResult(
    document: Document,
  ): EvaluateResultOutput | Promise<EvaluateResultOutput> {
    const validationResult = this.validateRequiredFields(document);

    if (validationResult) {
      return validationResult;
    }

    return {
      resultComment: this.RESULT_COMMENT.PASSED,
      resultStatus: RuleOutputStatus.PASSED,
    };
  }

  protected override getRuleSubject(document: Document): Document | undefined {
    return document;
  }
}\n`,
  },
  {
    name: `${fileName}.errors.ts`,
    content: `import { BaseProcessorErrors } from '@carrot-fndn/shared/methodologies/bold/processors';

export class ${pascalCase}ProcessorErrors extends BaseProcessorErrors {
  override readonly ERROR_MESSAGE = {
    DOCUMENT_TYPE_NOT_FOUND: 'Document type not found.',
    FAILED_BY_ERROR: 'Unable to validate the ${ruleName}.',
  } as const;
}\n`,
  },
  {
    name: `${fileName}.processor.spec.ts`,
    content: `import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { loadDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { random } from 'typia';

import { ${pascalCase}Processor } from './${fileName}.processor';
import { ${camelCase}TestCases } from './${fileName}.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('${pascalCase}Processor', () => {
  const ruleDataProcessor = new ${pascalCase}Processor();

  const documentLoaderService = jest.mocked(loadDocument);

  it.each(${camelCase}TestCases)(
    'should return $resultStatus when $scenario',
    async ({
      document,
      resultComment,
      resultStatus,
    }: {
      document: Document;
      resultComment: string;
      resultStatus: RuleOutputStatus;
    }) => {
      const ruleInput = random<Required<RuleInput>>();

      documentLoaderService.mockResolvedValueOnce(document);

      const ruleOutput = await ruleDataProcessor.process(ruleInput);

      const expectedRuleOutput: RuleOutput = {
        requestId: ruleInput.requestId,
        responseToken: ruleInput.responseToken,
        responseUrl: ruleInput.responseUrl,
        resultComment,
        resultStatus,
      };

      expect(ruleOutput).toEqual(expectedRuleOutput);
    },
  );
});\n`,
  },
  {
    name: `${fileName}.test-cases.ts`,
    content: `import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { RESULT_COMMENTS } from './${fileName}.processor';

const stubs = new BoldStubsBuilder().build();

export const ${camelCase}TestCases = [
  {
    document: stubs.massIdDocumentStub,
    resultComment: RESULT_COMMENTS.PASSED,
    resultStatus: RuleOutputStatus.PASSED,
    scenario: 'all the criteria are met',
  },
  // Add more test cases as needed
];\n`,
  },
  {
    name: `${fileName}.lambda.e2e.spec.ts`,
    content: `import { toDocumentKey } from '@carrot-fndn/shared/helpers';
import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { type RuleOutput } from '@carrot-fndn/shared/rule/types';
import {
  prepareEnvironmentTestE2E,
  stubContext,
  stubRuleInput,
  stubRuleResponse,
} from '@carrot-fndn/shared/testing';
import { faker } from '@faker-js/faker';

import { ${camelCase}Lambda } from './${fileName}.lambda';
import { ${camelCase}TestCases } from './${fileName}.test-cases';

describe('${pascalCase}Lambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const stubs = new BoldStubsBuilder().build();

  it.each(${camelCase}TestCases)(
    'should return $resultStatus when $scenario',
    async ({ document, resultStatus }) => {
      prepareEnvironmentTestE2E(
        [document, stubs.massIDAuditDocumentStub].map((_document) => ({
          document: _document,
          documentKey: toDocumentKey({
            documentId: _document.id,
            documentKeyPrefix,
          }),
        })),
      );

      const response = (await ${camelCase}Lambda(
        stubRuleInput({
          documentKeyPrefix,
          parentDocumentId: document.id,
        }),
        stubContext(),
        () => stubRuleResponse(),
      )) as RuleOutput;

      expect(response.resultStatus).toBe(resultStatus);
    },
  );
});\n`,
  },
];

if (!fs.existsSync(targetDirectory)) {
  try {
    fs.mkdirSync(targetDirectory, { recursive: true });
  } catch (error) {
    console.error(
      `Error creating directory ${targetDirectory}: ${error.message}`,
    );
    process.exit(1);
  }
} else {
  const filesExist = templates.some((template) =>
    fs.existsSync(path.join(targetDirectory, template.name)),
  );

  if (filesExist) {
    console.error(
      `Error: Files for rule '${ruleName}' already exist. Use a different name or remove existing files.`,
    );
    process.exit(1);
  }
}

// Write the template files to the target directory
templates.forEach((template) => {
  const filePath = path.join(targetDirectory, template.name);
  try {
    fs.writeFileSync(filePath, template.content);
    console.log(`Created ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}: ${error.message}`);
    process.exit(1);
  }
});

// Update the main index.ts file to export the new rule
const indexPath = path.join(projectRoot, 'src', 'index.ts');
if (fs.existsSync(indexPath)) {
  try {
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const newExport = `export * from './${ruleName}';\n`;

    // Check if the export already exists to avoid duplicates
    if (!indexContent.includes(newExport)) {
      fs.writeFileSync(indexPath, indexContent + newExport);
      console.log(`Updated ${indexPath}`);
    }
  } catch (error) {
    console.error(`Error updating index file ${indexPath}: ${error.message}`);
    process.exit(1);
  }
}

console.log(`\nSuccessfully created rule: ${ruleName} in scope: ${scope}`);
console.log(`\nNext steps:`);
console.log(
  `1. Implement your rule validation logic in ${targetDirectory}/${fileName}.processor.ts`,
);
console.log(
  `2. Add appropriate test cases in ${targetDirectory}/${fileName}.test-cases.ts`,
);
console.log(`3. Run tests with: pnpm test ${projectRoot}`);
