#!/usr/bin/env node

/**
 * This script updates project tags in the Nx workspace
 * It adds more specific tags based on project paths and types
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const tempFile = path.join(process.cwd(), 'temp-project-graph.json');

  execSync(`npx nx graph --file=${tempFile}`, { stdio: 'inherit' });

  const projectGraphRaw = fs.readFileSync(tempFile, 'utf8');
  const projectGraph = JSON.parse(projectGraphRaw);

  fs.unlinkSync(tempFile);

  Object.entries(projectGraph.graph.nodes).forEach(([projectName, project]) => {
    if (!project.data || !project.data.root) {
      console.log(`Skipping ${projectName}: Missing data or root`);
      return;
    }

    const projectJsonPath = path.join(
      process.cwd(),
      project.data.root,
      'project.json',
    );
    if (!fs.existsSync(projectJsonPath)) {
      console.log(
        `Skipping ${projectName}: No project.json found at ${projectJsonPath}`,
      );
      return;
    }

    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    const tags = new Set(projectJson.tags || []);

    if (project.data.tags) {
      project.data.tags.forEach((tag) => tags.add(tag));
    }

    if (project.data.root.includes('rule-processors')) {
      if (project.data.root.includes('/mass-id/')) {
        tags.add('processor:mass-id');
      } else if (project.data.root.includes('/mass/')) {
        tags.add('processor:mass');
      } else if (project.data.root.includes('/credit/')) {
        tags.add('processor:credit');
      } else if (project.data.root.includes('/mass-certificate/')) {
        tags.add('processor:certificate');
      }
    }

    if (project.data.root.startsWith('libs/shared/')) {
      tags.add('scope:shared');
    }

    if (project.data.root.includes('methodologies/bold/processors')) {
      tags.add('processor:shared');
    }

    projectJson.tags = [...tags].sort();
    fs.writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2));
    console.log(`Updated tags for ${projectName}`);
  });

  console.log('Project tags updated successfully!');
} catch (error) {
  console.error('Error updating project tags:', error);
  process.exit(1);
}
