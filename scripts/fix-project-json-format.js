#!/usr/bin/env node

/**
 * This script fixes the formatting of all project.json files
 * It ensures they follow the same format and have a newline at the end
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all project.json files in the workspace
try {
  // Get a list of all project.json files
  const projectJsonFiles = execSync('find apps libs -name "project.json"', {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean);

  console.log(`Found ${projectJsonFiles.length} project.json files`);

  // Process each project.json file
  projectJsonFiles.forEach((projectJsonPath) => {
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));

    // Ensure tags are sorted and on a single line
    if (projectJson.tags) {
      projectJson.tags = projectJson.tags.sort();
    }

    // Write the file with proper formatting
    const formattedJson = JSON.stringify(projectJson, null, 2) + '\n';
    fs.writeFileSync(projectJsonPath, formattedJson);
    console.log(`Fixed formatting for ${projectJsonPath}`);
  });

  console.log('All project.json files formatted successfully!');
} catch (error) {
  console.error('Error formatting project.json files:', error);
  process.exit(1);
}
