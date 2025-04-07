#!/usr/bin/env node

/**
 * Update Waste Classification Constants
 *
 * This script updates the waste classification constants file based on a CSV file.
 * It reads the CSV data, extracts codes with valid CMD_CODE values, and updates the constants file.
 *
 * Usage:
 *   node update-waste-classification.js <path-to-csv-file>
 *
 * Example:
 *   node update-waste-classification.js ../downloads/waste-classification.csv
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

// Define the target file path
const TARGET_FILE = path.resolve(
  __dirname,
  '../libs/methodologies/bold/rule-processors/mass-id/src/local-waste-classification/local-waste-classification.constants.ts',
);

// Get command line arguments
const csvFilePath = process.argv[2];

// Check for required arguments and help flag
if (!csvFilePath || csvFilePath === '--help' || csvFilePath === '-h') {
  console.log(`
Update Waste Classification Constants

Usage: node update-waste-classification.js <path-to-csv-file>

Arguments:
  path-to-csv-file  Path to the CSV file containing the waste classification data

Example:
  node update-waste-classification.js ../downloads/waste-classification.csv
  `);
  process.exit(0);
}

// Check if CSV file exists
if (!fs.existsSync(csvFilePath)) {
  console.error(`Error: CSV file '${csvFilePath}' does not exist.`);
  process.exit(1);
}

// Check if target file exists
if (!fs.existsSync(TARGET_FILE)) {
  console.error(`Error: Target file '${TARGET_FILE}' does not exist.`);
  process.exit(1);
}

// Read the current constants file
const currentFile = fs.readFileSync(TARGET_FILE, 'utf8');

// Function to extract waste classification data from the CSV
function extractWasteClassificationFromCSV(csvFilePath) {
  return new Promise((resolve, reject) => {
    const results = { BR: {} };
    let rowCount = 0;
    let codesFound = 0;
    let codesSkippedNoCmd = 0;
    const missingCmdCodes = [];
    const validCodes = [];

    // Create a readable stream from the CSV file
    const parser = parse({
      delimiter: ',',
      from_line: 6, // Skip the header lines (equivalent to skipping first 5 lines)
      skip_empty_lines: true,
      trim: true,
      columns: false, // We'll work with raw arrays instead of objects
      relax_column_count: true, // Allow varying column counts in rows
    });

    // Create the readable stream
    const fileStream = fs.createReadStream(csvFilePath);

    // Pipe the file stream to the parser
    fileStream
      .pipe(parser)
      .on('data', (record) => {
        // Check if this is a waste code line (starts with XX XX XX format)
        const code = record[0]?.trim() || '';
        if (code && code.length === 8 && code[2] === ' ' && code[5] === ' ') {
          rowCount++;
          // Extract description
          const description = (record[1] || '')
            .trim()
            .replace(/–\s*$/, '')
            .replace(/-\s*$/, '')
            .replace(/^"/, '')
            .replace(/"$/, '');

          // Specifically look for CMD_CODE in column F (index 5) which is "CARROT'S BOLD-C"
          let cmdCode = '';
          if (record.length > 5) {
            const columnValue = record[5]?.trim() || '';
            if (columnValue.match(/^8\.\d+[A-D]?$/)) {
              cmdCode = columnValue;
            }
          }

          if (description && cmdCode) {
            // Only add codes that have a valid CMD_CODE in the CARROT'S BOLD-C column
            codesFound++;
            validCodes.push(code);
            // Use the code as a string key to avoid octal literals errors
            results.BR[code] = {
              CMD_CODE: cmdCode,
              description: description,
            };
          } else if (description) {
            // Log codes where CMD_CODE wasn't found in the CARROT'S BOLD-C column but DO NOT include in results
            codesSkippedNoCmd++;
            missingCmdCodes.push({ code, description });
          }
        }
      })
      .on('end', () => {
        if (codesFound === 0) {
          reject(
            new Error('No valid waste classification data found in the CSV.'),
          );
        } else {
          console.log(`Processed ${rowCount} rows from the CSV file.`);
          console.log(
            `Found ${codesFound} waste classification codes with valid CMD_CODE.`,
          );

          if (codesSkippedNoCmd > 0) {
            console.log(
              `Skipped ${codesSkippedNoCmd} codes because they don't have a CMD_CODE.`,
            );
          }

          if (missingCmdCodes.length > 0) {
            console.log(
              `Warning: ${missingCmdCodes.length} codes had no CMD_CODE and were NOT included in the constants file:`,
            );
            missingCmdCodes.slice(0, 5).forEach((item) => {
              console.log(
                `  - ${item.code}: ${item.description.substring(0, 30)}...`,
              );
            });
            if (missingCmdCodes.length > 5) {
              console.log(`  ... and ${missingCmdCodes.length - 5} more`);
            }

            // Write missing codes to a file for manual review
            const missingCodesFile = path.join(
              __dirname,
              'missing-waste-codes.json',
            );
            fs.writeFileSync(
              missingCodesFile,
              JSON.stringify(missingCmdCodes, null, 2),
              'utf8',
            );
            console.log(
              `Full list of skipped codes written to ${missingCodesFile}`,
            );
          }

          // Write validation report
          const validationReport = {
            totalRowsProcessed: rowCount,
            totalCodesFound: codesFound,
            codesSkippedNoCmd: codesSkippedNoCmd,
            validCodes: validCodes,
            missingCmdCodes: missingCmdCodes.map((item) => item.code),
          };

          const reportFile = path.join(
            __dirname,
            'waste-classification-report.json',
          );
          fs.writeFileSync(
            reportFile,
            JSON.stringify(validationReport, null, 2),
            'utf8',
          );
          console.log(`Validation report written to ${reportFile}`);

          resolve(results);
        }
      })
      .on('error', (error) => {
        reject(new Error(`Error parsing CSV file: ${error.message}`));
      });
  });
}

// Function to update the constants file with new data
function updateConstantsFile(currentFile, newData) {
  // Extract existing data and constants
  const constDeclarationEndIndex = currentFile.indexOf(
    'export const WASTE_CLASSIFICATION_IDS',
  );
  const constDeclarations = currentFile.substring(0, constDeclarationEndIndex);

  // Extract constant definitions
  const constantMap = {};
  const constantRegex = /const\s+([A-Z_]+)\s*=\s*['"](.+)['"]\s*;/g;
  let match;
  while ((match = constantRegex.exec(constDeclarations)) !== null) {
    const constantName = match[1];
    const constantValue = match[2];
    constantMap[constantValue] = constantName;
  }

  // Function to replace description with constant name if it exists
  function getConstantOrValue(description) {
    const trimmedDesc = description.trim();
    // Remove trailing spaces from the value for comparison
    for (const [value, name] of Object.entries(constantMap)) {
      if (trimmedDesc === value.trim()) {
        return name;
      }
    }
    return `"${description}"`;
  }

  // Create new content with the existing constants and new data
  let updatedContent = constDeclarations;
  updatedContent += 'export const WASTE_CLASSIFICATION_IDS = ';

  // Begin building the structured output
  let formattedOutput = '{\n  BR: {\n';

  // Sort the keys to maintain consistent ordering
  const sortedCodes = Object.keys(newData.BR).sort();

  for (const code of sortedCodes) {
    const item = newData.BR[code];
    const description = item.description;
    const cmdCode = item.CMD_CODE;

    formattedOutput += `    '${code}': {\n`;
    formattedOutput += `      CMD_CODE: "${cmdCode}",\n`;
    formattedOutput += `      description: ${getConstantOrValue(description)}\n`;
    formattedOutput += `    },\n`;
  }

  formattedOutput += '  }\n} as const;';

  updatedContent += formattedOutput;

  return updatedContent;
}

// Function to show diff between old and new content
function showDiff(oldContent, newContent) {
  try {
    // Extract the waste code definitions
    const oldCodesPattern =
      /'(\d\d \d\d \d\d)':\s*{[^}]*CMD_CODE:\s*"([^"]+)"[^}]*description:\s*([^,}]+)/g;
    const newCodesPattern =
      /'(\d\d \d\d \d\d)':\s*{[^}]*CMD_CODE:\s*"([^"]+)"[^}]*description:\s*([^,}]+)/g;

    const oldCodes = {};
    const newCodes = {};

    // Extract old codes
    let match;
    while ((match = oldCodesPattern.exec(oldContent)) !== null) {
      const code = match[1];
      const cmdCode = match[2];
      const description = match[3].trim();
      oldCodes[code] = { cmdCode, description };
    }

    // Extract new codes
    while ((match = newCodesPattern.exec(newContent)) !== null) {
      const code = match[1];
      const cmdCode = match[2];
      const description = match[3].trim();
      newCodes[code] = { cmdCode, description };
    }

    // Count changes
    let addedLines = 0;
    let removedLines = 0;
    let changedLines = 0;

    console.log('\nChanges:');

    // Compare codes
    for (const code in newCodes) {
      if (oldCodes[code]) {
        // Check if changed
        if (
          oldCodes[code].cmdCode !== newCodes[code].cmdCode ||
          oldCodes[code].description !== newCodes[code].description
        ) {
          changedLines++;
          console.log(`\nCode ${code} changed:`);
          if (oldCodes[code].cmdCode !== newCodes[code].cmdCode) {
            console.log(`- CMD_CODE: "${oldCodes[code].cmdCode}"`);
            console.log(`+ CMD_CODE: "${newCodes[code].cmdCode}"`);
          }
          if (oldCodes[code].description !== newCodes[code].description) {
            console.log(`- Description: ${oldCodes[code].description}`);
            console.log(`+ Description: ${newCodes[code].description}`);
          }
        }
      } else {
        // New code
        addedLines++;
        console.log(`\nNew code added: ${code}`);
        console.log(`+ CMD_CODE: "${newCodes[code].cmdCode}"`);
        console.log(`+ Description: ${newCodes[code].description}`);
      }
    }

    // Check for removed codes
    for (const code in oldCodes) {
      if (!newCodes[code]) {
        removedLines++;
        console.log(`\nCode removed: ${code}`);
        console.log(`- CMD_CODE: "${oldCodes[code].cmdCode}"`);
        console.log(`- Description: ${oldCodes[code].description}`);
      }
    }

    // Summary of changes
    console.log(
      `\nSummary: ${addedLines} codes added, ${removedLines} codes removed, ${changedLines} codes changed.`,
    );

    return addedLines > 0 || removedLines > 0 || changedLines > 0;
  } catch (error) {
    console.error(`Error comparing files: ${error.message}`);
    return true; // Return true to force update
  }
}

// Function to create backup of constants file
function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup at ${backupPath}`);
  return backupPath;
}

// Main function
async function main() {
  try {
    // Create backup before making changes
    createBackup(TARGET_FILE);

    console.log(`Reading CSV file: ${csvFilePath}`);
    const newData = await extractWasteClassificationFromCSV(csvFilePath);

    console.log(`Updating constants file: ${TARGET_FILE}`);
    const updatedContent = updateConstantsFile(currentFile, newData);

    // Show diff
    const hasDiff = showDiff(currentFile, updatedContent);

    if (hasDiff) {
      // Write the updated content back to the file
      fs.writeFileSync(TARGET_FILE, updatedContent, 'utf8');
      console.log(`\nSuccessfully updated ${TARGET_FILE}`);
    } else {
      console.log(`\nNo updates needed for ${TARGET_FILE}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
