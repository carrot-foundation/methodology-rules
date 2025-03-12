#!/usr/bin/env node

/**
 * Mass ID Rule Generator
 *
 * This script generates a new rule for the mass-id library with all necessary files.
 * It creates the rule structure based on the mass-definition example.
 *
 * Usage:
 *   pnpm create-mass-id-rule <rule-name> [description]
 *
 * Example:
 *   pnpm create-mass-id-rule vehicle-definition "Validates the vehicle definition in the mass-id document"
 */

const fs = require('fs');
const path = require('path');

// Get the rule name from command line arguments
const ruleName = process.argv[2];

// Check for help flag
if (!ruleName || ruleName === '--help' || ruleName === '-h') {
  console.log(`
Mass ID Rule Generator

Usage: create-mass-id-rule <rule-name> [description]

Arguments:
  rule-name    The name of the rule (required)
  description  A brief description of the rule (optional)

Example:
  create-mass-id-rule vehicle-definition "Validates the vehicle definition in the mass-id document"
  `);
  process.exit(0);
}

const description = process.argv[3] || 'The rule validation is compliant.';

// Convert rule name to different formats
const camelCase = ruleName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
const pascalCase = camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
const fileName = ruleName;

// Define the target directory
const projectRoot = 'libs/methodologies/bold/rule-processors/mass-id';
const targetDirectory = path.join(projectRoot, 'src', ruleName);

// Create the target directory if it doesn't exist
if (!fs.existsSync(targetDirectory)) {
  fs.mkdirSync(targetDirectory, { recursive: true });
}

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
import {
  type Document,
  DocumentCategory,
  DocumentType,
} from '@carrot-fndn/shared/methodologies/bold/types';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { ${pascalCase}ProcessorErrors } from './${fileName}.errors';

export const RESULT_COMMENTS = {
  APPROVED: '${description}',
  REJECTED: 'The rule validation failed.',
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
        resultStatus: RuleOutputStatus.REJECTED,
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

    // TODO: Implement your rule validation logic here
    const isValid = true; // Replace with actual validation

    return {
      resultComment: isValid
        ? this.RESULT_COMMENT.APPROVED
        : this.RESULT_COMMENT.REJECTED,
      resultStatus: isValid
        ? RuleOutputStatus.APPROVED
        : RuleOutputStatus.REJECTED,
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
    REJECTED_BY_ERROR: 'Unable to validate the ${ruleName}.',
  } as const;
}\n`,
  },
  {
    name: `${fileName}.processor.spec.ts`,
    content: `import type { Document } from '@carrot-fndn/shared/methodologies/bold/types';

import { loadParentDocument } from '@carrot-fndn/shared/methodologies/bold/io-helpers';
import {
  type RuleInput,
  type RuleOutput,
  RuleOutputStatus,
} from '@carrot-fndn/shared/rule/types';
import { stubEnumValue } from '@carrot-fndn/shared/testing';
import { random } from 'typia';

import { ${pascalCase}Processor, RESULT_COMMENTS } from './${fileName}.processor';
import { ${camelCase}TestCases } from './${fileName}.test-cases';

jest.mock('@carrot-fndn/shared/methodologies/bold/io-helpers');

describe('${pascalCase}Processor', () => {
  const ruleDataProcessor = new ${pascalCase}Processor();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(ruleDataProcessor).toBeDefined();
  });

  describe('process', () => {
    it('should return REJECTED when document is not found', async () => {
      // Arrange
      const ruleInput = random<RuleInput>();
      const mockLoadParentDocument = loadParentDocument as jest.Mock;
      mockLoadParentDocument.mockResolvedValueOnce(undefined);

      // Act
      const result = await ruleDataProcessor.process(ruleInput);

      // Assert
      expect(result).toEqual<RuleOutput>({
        resultComment: expect.any(String),
        resultStatus: RuleOutputStatus.REJECTED,
      });
    });

    it.each(${camelCase}TestCases)(
      'should return $resultStatus when $scenario',
      async ({ massIdDocument, resultComment, resultStatus }) => {
        // Arrange
        const ruleInput = random<RuleInput>();
        const mockLoadParentDocument = loadParentDocument as jest.Mock;
        mockLoadParentDocument.mockResolvedValueOnce(massIdDocument);

        // Act
        const result = await ruleDataProcessor.process(ruleInput);

        // Assert
        expect(result).toEqual<RuleOutput>({
          resultComment,
          resultStatus,
        });
      },
    );
  });
});\n`,
  },
  {
    name: `${fileName}.test-cases.ts`,
    content: `import { BoldStubsBuilder } from '@carrot-fndn/shared/methodologies/bold/testing';
import { RuleOutputStatus } from '@carrot-fndn/shared/rule/types';

import { ${pascalCase}ProcessorErrors } from './${fileName}.errors';
import { RESULT_COMMENTS } from './${fileName}.processor';

const massIdStubs = new BoldStubsBuilder().build();
const processorErrors = new ${pascalCase}ProcessorErrors();

export const ${camelCase}TestCases = [
  {
    massIdDocument: massIdStubs.massIdDocumentStub,
    resultComment: RESULT_COMMENTS.APPROVED,
    resultStatus: RuleOutputStatus.APPROVED,
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
import { faker } from '@faker-js/faker/.';

import { ${camelCase}Lambda } from './${fileName}.lambda';
import { ${camelCase}TestCases } from './${fileName}.test-cases';

describe('${pascalCase}Lambda E2E', () => {
  const documentKeyPrefix = faker.string.uuid();

  const massId = new BoldStubsBuilder().build();

  it.each(${camelCase}TestCases)(
    'should return $resultStatus when $scenario',
    async ({ massIdDocument, resultComment, resultStatus }) => {
      // Arrange
      const documentKey = toDocumentKey(
        documentKeyPrefix,
        massIdDocument.documentId,
      );

      const ruleInput = stubRuleInput({
        documentKey,
      });

      const context = stubContext();

      prepareEnvironmentTestE2E({
        documentKey,
        document: massIdDocument,
      });

      // Act
      const result = await ${camelCase}Lambda(ruleInput, context);

      // Assert
      expect(result).toEqual(
        stubRuleResponse({
          resultComment,
          resultStatus,
        }),
      );
    },
  );
});\n`,
  },
];

// Write the template files to the target directory
templates.forEach((template) => {
  const filePath = path.join(targetDirectory, template.name);
  fs.writeFileSync(filePath, template.content);
  console.log(`Created ${filePath}`);
});

// Update the main index.ts file to export the new rule
const indexPath = path.join(projectRoot, 'src', 'index.ts');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  const newExport = `export * from './${ruleName}';\n`;

  // Check if the export already exists to avoid duplicates
  if (!indexContent.includes(newExport)) {
    fs.writeFileSync(indexPath, indexContent + newExport);
    console.log(`Updated ${indexPath}`);
  }
}

console.log(`\nSuccessfully created rule: ${ruleName}`);
console.log(`\nNext steps:`);
console.log(
  `1. Implement your rule validation logic in ${targetDirectory}/${fileName}.processor.ts`,
);
console.log(
  `2. Add appropriate test cases in ${targetDirectory}/${fileName}.test-cases.ts`,
);
console.log(`3. Run tests with: pnpm test ${projectRoot}`);
