#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const DRY_RUN = args.has('--dry-run');

const PATHS = {
  canonicalRoot: path.join(ROOT, '.ai'),
  canonicalRules: path.join(ROOT, '.ai', 'rules'),
  canonicalSkills: path.join(ROOT, '.ai', 'capabilities', 'skills'),
  canonicalAgents: path.join(ROOT, '.ai', 'capabilities', 'agents'),
  canonicalSchemas: path.join(ROOT, '.ai', 'schemas'),

  cursorRules: path.join(ROOT, '.cursor', 'rules'),
  cursorSkills: path.join(ROOT, '.cursor', 'skills'),
  cursorAgents: path.join(ROOT, '.cursor', 'agents'),

  claudeRoot: path.join(ROOT, '.claude'),
  claudeSkills: path.join(ROOT, '.claude', 'skills'),
  claudeAgents: path.join(ROOT, '.claude', 'agents'),

  codexSkills: path.join(ROOT, '.agents', 'skills'),
  rootAgents: path.join(ROOT, 'AGENTS.md'),
  rootClaude: path.join(ROOT, 'CLAUDE.md'),
  projectContext: path.join(ROOT, '.ai', 'PROJECT_CONTEXT.md'),

  parityMatrix: path.join(ROOT, '.ai', 'PARITY_MATRIX.md'),
};

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath) {
  if (DRY_RUN) {
    return;
  }
  await fs.mkdir(targetPath, { recursive: true });
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return { data: {}, body: content.trim() };
  }

  const closing = content.indexOf('\n---\n', 4);
  if (closing === -1) {
    return { data: {}, body: content.trim() };
  }

  const frontmatterRaw = content.slice(4, closing);
  const body = content
    .slice(closing + 5)
    .replace(/^\n+/, '')
    .trim();

  const data = {};
  let currentArrayKey = null;

  for (const line of frontmatterRaw.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentArrayKey) {
      data[currentArrayKey].push(parseScalar(listMatch[1]));
      continue;
    }

    const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kvMatch) {
      continue;
    }

    const key = kvMatch[1];
    const value = kvMatch[2];

    if (value === '') {
      data[key] = [];
      currentArrayKey = key;
      continue;
    }

    data[key] = parseScalar(value);
    currentArrayKey = null;
  }

  return { data, body };
}

function quote(value) {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }

  const str = String(value);
  if (str === '') {
    return "''";
  }

  if (/^[A-Za-z0-9_./:@-]+$/.test(str)) {
    return str;
  }

  const escaped = str.replaceAll("'", "''");
  return `'${escaped}'`;
}

function toFrontmatter(data, preferredOrder = []) {
  const keys = [
    ...preferredOrder.filter((key) => key in data),
    ...Object.keys(data).filter((key) => !preferredOrder.includes(key)),
  ];
  const lines = ['---'];

  for (const key of keys) {
    const value = data[key];

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${quote(String(item))}`);
      }
      continue;
    }

    lines.push(`${key}: ${quote(String(value))}`);
  }

  lines.push('---');
  return `${lines.join('\n')}\n`;
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function titleFromId(id) {
  return id
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

async function listFilesRecursive(dir, extension) {
  if (!(await pathExists(dir))) {
    return [];
  }

  const result = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && fullPath.endsWith(extension)) {
        result.push(fullPath);
      }
    }
  }

  await walk(dir);
  return result.sort();
}

function matchSectionHeading(line, heading) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('## ')) return false;
  const afterHash = trimmed.slice(3).trim();
  return afterHash.toLowerCase() === heading.toLowerCase();
}

function getSectionBody(markdownBody, heading) {
  const lines = markdownBody.split('\n');
  const start = lines.findIndex((line) => matchSectionHeading(line, heading));
  if (start === -1) {
    return markdownBody.trim();
  }

  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      break;
    }
    out.push(lines[i]);
  }

  return out.join('\n').trim();
}

function getSectionBodyToEnd(markdownBody, heading, contextLabel = '') {
  const lines = markdownBody.split('\n');
  const start = lines.findIndex((line) => matchSectionHeading(line, heading));
  if (start === -1) {
    log(
      `[sync] warning: section "## ${heading}" not found${contextLabel ? ` (${contextLabel})` : ''}; using full body`,
    );
    return markdownBody.trim();
  }

  return lines
    .slice(start + 1)
    .join('\n')
    .trim();
}

function extractBullets(markdownBody, heading) {
  const section = getSectionBody(markdownBody, heading);
  const bullets = section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter(Boolean);

  return bullets;
}

async function writeFile(targetPath, content) {
  if (DRY_RUN) {
    return;
  }
  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, `${content.replace(/\s+$/u, '')}\n`, 'utf8');
}

async function writeIfMissing(targetPath, content) {
  if (!FORCE && (await pathExists(targetPath))) {
    return;
  }
  await writeFile(targetPath, content);
}

function renderRuleCanonical(data, body) {
  const fm = toFrontmatter(data, ['id', 'intent', 'scope', 'requirements', 'anti_patterns']);

  return `${fm}\n# ${titleFromId(data.id)} Rule\n\n## Rule body\n\n${body.trim()}\n`;
}

function renderSkillCanonical(data, body) {
  const fm = toFrontmatter(data, [
    'id',
    'name',
    'description',
    'when_to_use',
    'workflow',
    'inputs',
    'outputs',
    'references',
  ]);

  return `${fm}\n# ${titleFromId(data.id)} Skill\n\n## Instructions\n\n${body.trim()}\n`;
}

function renderAgentCanonical(data, body) {
  const fm = toFrontmatter(data, [
    'id',
    'name',
    'purpose',
    'when_to_delegate',
    'checklist',
    'report_format',
    'tool_limits',
  ]);

  return `${fm}\n# ${titleFromId(data.id)} Agent\n\n## Instructions\n\n${body.trim()}\n`;
}

async function bootstrapCanonicalRules() {
  const sourceFiles = await listFilesRecursive(PATHS.cursorRules, '.mdc');
  for (const sourceFile of sourceFiles) {
    const id = path.basename(sourceFile, '.mdc');
    const canonicalPath = path.join(PATHS.canonicalRules, `${id}.md`);

    if (!FORCE && (await pathExists(canonicalPath))) {
      continue;
    }

    const raw = await fs.readFile(sourceFile, 'utf8');
    const { data: frontmatter, body } = parseFrontmatter(raw);

    const globs = normalizeArray(frontmatter.globs);
    const requirements = extractBullets(body, 'Standards');
    const antiPatterns = extractBullets(body, 'Anti-patterns');

    const canonicalData = {
      id,
      intent: String(frontmatter.description || `Rule for ${id}`),
      scope: globs.length > 0 ? globs : ['*'],
      requirements:
        requirements.length > 0
          ? requirements
          : ['Follow the requirements defined in the rule body.'],
      anti_patterns:
        antiPatterns.length > 0
          ? antiPatterns
          : ['Avoid the anti-patterns listed in the rule body.'],
    };

    await writeFile(canonicalPath, renderRuleCanonical(canonicalData, body));
    log(`bootstrapped canonical rule: ${id}`);
  }
}

function collectPathReferences(text) {
  const refs = new Set();
  const regex = /`([^`]+)`/g;
  let match = regex.exec(text);
  while (match) {
    const value = match[1];
    if (value.includes('/') && !value.startsWith('http')) {
      refs.add(value);
    }
    match = regex.exec(text);
  }
  return [...refs].slice(0, 10);
}

async function bootstrapCanonicalSkills() {
  if (!(await pathExists(PATHS.cursorSkills))) return;
  const entries = await fs.readdir(PATHS.cursorSkills, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const id = entry.name;
    const sourceFile = path.join(PATHS.cursorSkills, id, 'SKILL.md');
    if (!(await pathExists(sourceFile))) continue;

    const canonicalPath = path.join(PATHS.canonicalSkills, `${id}.md`);
    if (!FORCE && (await pathExists(canonicalPath))) {
      continue;
    }

    const raw = await fs.readFile(sourceFile, 'utf8');
    const { data: frontmatter, body } = parseFrontmatter(raw);

    const whenToUse = extractBullets(body, 'When to use');
    const workflow = extractBullets(body, 'Workflow');
    const refs = collectPathReferences(body);

    const canonicalData = {
      id,
      name: String(frontmatter.name || id),
      description: String(frontmatter.description || `Skill for ${id}`),
      when_to_use:
        whenToUse.length > 0 ? whenToUse : [`Use this skill when the task matches ${id}.`],
      workflow:
        workflow.length > 0 ? workflow : ['Follow the instruction steps in the skill body.'],
      inputs: ['User request and repository context.'],
      outputs: ['Completed task result with verification.'],
      references: refs.length > 0 ? refs : ['CLAUDE.md'],
    };

    await writeFile(canonicalPath, renderSkillCanonical(canonicalData, body));
    log(`bootstrapped canonical skill: ${id}`);
  }
}

async function bootstrapCanonicalAgents() {
  const sourceFiles = await listFilesRecursive(PATHS.cursorAgents, '.md');
  for (const sourceFile of sourceFiles) {
    const id = path.basename(sourceFile, '.md');
    const canonicalPath = path.join(PATHS.canonicalAgents, `${id}.md`);

    if (!FORCE && (await pathExists(canonicalPath))) {
      continue;
    }

    const raw = await fs.readFile(sourceFile, 'utf8');
    const { data: frontmatter, body } = parseFrontmatter(raw);

    const whenToDelegate = extractBullets(body, 'When Invoked');
    const checklist = extractBullets(body, 'Verification Steps');
    const reportFormat = getSectionBody(body, 'Report Format');

    const canonicalData = {
      id,
      name: String(frontmatter.name || id),
      purpose: String(frontmatter.description || `Specialist agent for ${id}`),
      when_to_delegate:
        whenToDelegate.length > 0
          ? whenToDelegate
          : [`Delegate when specialized ${id} analysis is needed.`],
      checklist: checklist.length > 0 ? checklist : ['Follow the steps in the agent instructions.'],
      report_format: reportFormat
        ? reportFormat.split('\n')[0].slice(0, 120)
        : 'Provide a structured report with findings and verification.',
      tool_limits: ['Respect project sandbox and approval policies.'],
    };

    await writeFile(canonicalPath, renderAgentCanonical(canonicalData, body));
    log(`bootstrapped canonical agent: ${id}`);
  }
}

function renderCursorRule(rule) {
  const globs = normalizeArray(rule.data.scope);
  const isUniversal = globs.length === 1 && globs[0] === '*';
  const frontmatter = {
    description: rule.data.intent,
    globs: globs.length > 0 ? globs : ['*'],
    alwaysApply: isUniversal,
  };

  const fm = toFrontmatter(frontmatter, ['description', 'globs', 'alwaysApply']);
  let body = getSectionBodyToEnd(rule.body, 'Rule body', `rule:${rule.data.id}`);

  const substantiveLines = body
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('>'));
  const isMinimal = substantiveLines.length < 3;
  const hasFrontmatterContent =
    (rule.data.requirements?.length || 0) > 0 || (rule.data.anti_patterns?.length || 0) > 0;

  if (isMinimal && hasFrontmatterContent) {
    const sections = [];
    const reqs = normalizeArray(rule.data.requirements);
    if (reqs.length > 0) {
      sections.push('## Requirements\n\n' + reqs.map((r) => `- ${r}`).join('\n'));
    }
    const anti = normalizeArray(rule.data.anti_patterns);
    if (anti.length > 0) {
      sections.push('## Anti-patterns\n\n' + anti.map((a) => `- ${a}`).join('\n'));
    }
    if (sections.length > 0) {
      body = `${body.trim()}\n\n${sections.join('\n\n')}`;
    }
  }

  return `${fm}\n${body}\n`;
}

function renderSkillFile(skill) {
  const frontmatter = {
    name: skill.data.name || skill.data.id,
    description: skill.data.description || `Skill for ${skill.data.id}`,
  };

  const fm = toFrontmatter(frontmatter, ['name', 'description']);
  const body = getSectionBodyToEnd(skill.body, 'Instructions', `skill:${skill.data.id}`);
  return `${fm}\n${body}\n`;
}

function renderAgentFile(agent) {
  const frontmatter = {
    name: agent.data.name || agent.data.id,
    description: agent.data.purpose || `Specialist agent for ${agent.data.id}`,
    model: 'default',
  };

  const fm = toFrontmatter(frontmatter, ['name', 'description', 'model']);
  const body = getSectionBodyToEnd(agent.body, 'Instructions', `agent:${agent.data.id}`);
  return `${fm}\n${body}\n`;
}

function renderRuleSkillFile(rule) {
  const frontmatter = {
    name: `rule-${rule.data.id}`,
    description: `Rule mapping for ${rule.data.id}`,
  };

  const fm = toFrontmatter(frontmatter, ['name', 'description']);
  const scope = normalizeArray(rule.data.scope);

  return `${fm}\n# Rule ${rule.data.id}\n\nApply this rule whenever work touches:\n${scope.map((item) => `- \`${item}\``).join('\n')}\n\n${getSectionBodyToEnd(rule.body, 'Rule body', `rule:${rule.data.id}`)}\n`;
}

function renderAgentAsCodexSkill(agent) {
  const frontmatter = {
    name: agent.data.id,
    description: agent.data.purpose || `Specialist role for ${agent.data.id}`,
  };

  const fm = toFrontmatter(frontmatter, ['name', 'description']);
  const whenToDelegate = normalizeArray(agent.data.when_to_delegate);
  const checklist = normalizeArray(agent.data.checklist);

  return `${fm}\n# Specialist Role: ${agent.data.name || agent.data.id}\n\nUse this skill when:\n${whenToDelegate.map((item) => `- ${item}`).join('\n')}\n\n## Checklist\n${checklist.map((item) => `- ${item}`).join('\n')}\n\n## Report format\n${agent.data.report_format || 'Provide a structured report with findings and verification.'}\n\n## Instructions\n\n${getSectionBodyToEnd(agent.body, 'Instructions', `agent:${agent.data.id}`)}\n`;
}

async function loadCanonicalFiles(dir) {
  const files = await listFilesRecursive(dir, '.md');
  const out = [];
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = parseFrontmatter(raw);
    out.push({ file, data: parsed.data, body: parsed.body });
  }
  return out.sort((a, b) => String(a.data.id).localeCompare(String(b.data.id)));
}

async function writeCanonicalBaseDocs() {
  await ensureDir(PATHS.canonicalRoot);
  await ensureDir(PATHS.canonicalSchemas);

  await writeIfMissing(
    path.join(PATHS.canonicalRoot, 'README.md'),
    `# AI instructions\n\nNeutral source-of-truth for Cursor, Claude, and Codex instructions.\n\n## Governance\n\n- Edit canonical instruction files only under \`.ai/\`.\n- Regenerate all platform adapters with \`pnpm ai:sync\`.\n- Validate parity and links with \`pnpm ai:check\`.\n- Hard delete only: remove from canonical and all adapters in the same change.\n\n## Structure\n\n- \`DEFINITIONS.md\`\n- \`STANDARDS.md\`\n- \`PARITY_MATRIX.md\`\n- \`rules/*.md\`\n- \`capabilities/skills/*.md\`\n- \`capabilities/agents/*.md\`\n- \`schemas/*.yaml\`\n`,
  );

  await writeIfMissing(
    path.join(PATHS.canonicalRoot, 'DEFINITIONS.md'),
    `# Definitions\n\n- **Policy**: cross-cutting instruction that applies across tools.\n- **Rule**: scoped behavioral requirement mapped to each platform.\n- **Skill**: reusable workflow unit.\n- **Agent**: specialist role for targeted execution or review.\n- **Adapter**: generated tool-specific artifact from canonical files.\n- **Parity**: equivalent capability coverage across Cursor, Claude, and Codex.\n`,
  );

  await writeIfMissing(
    path.join(PATHS.canonicalRoot, 'STANDARDS.md'),
    `# Standards\n\n## Equal-first\n\n- Cursor, Claude, and Codex are treated as equals.\n- No platform is primary for capability definition.\n- All canonical skills, agents, and rules must map across all tools.\n\n## Capability requirements\n\n### Rules\n\nRequired fields: \`id\`, \`intent\`, \`scope\`, \`requirements\`, \`anti_patterns\`.\n\n### Skills\n\nRequired fields: \`id\`, \`name\`, \`description\`, \`when_to_use\`, \`workflow\`, \`inputs\`, \`outputs\`, \`references\`.\n\n### Agents\n\nRequired fields: \`id\`, \`name\`, \`purpose\`, \`when_to_delegate\`, \`checklist\`, \`report_format\`, \`tool_limits\`.\n`,
  );

  await writeIfMissing(
    path.join(PATHS.canonicalRoot, 'PROJECT_CONTEXT.md'),
    `# Project Context\n\nProject-specific knowledge for AI assistants.\n\n## Project Overview\n\nDescribe the project name, purpose, and audience here.\n\n## Scope\n\nDefine what is in and out of scope for AI assistance.\n\n## How to use\n\nThis file is appended to generated adapters (e.g., CLAUDE.md) to provide project-specific context.\nEdit this file directly; regenerate adapters with \`pnpm ai:sync\`.\n`,
  );

  await writeIfMissing(
    path.join(PATHS.canonicalSchemas, 'rule.schema.yaml'),
    `type: object\nrequired:\n  - id\n  - intent\n  - scope\n  - requirements\n  - anti_patterns\nproperties:\n  id:\n    type: string\n  intent:\n    type: string\n  scope:\n    type: array\n    items:\n      type: string\n  requirements:\n    type: array\n    items:\n      type: string\n  anti_patterns:\n    type: array\n    items:\n      type: string\n`,
  );

  await writeIfMissing(
    path.join(PATHS.canonicalSchemas, 'skill.schema.yaml'),
    `type: object\nrequired:\n  - id\n  - name\n  - description\n  - when_to_use\n  - workflow\n  - inputs\n  - outputs\n  - references\nproperties:\n  id:\n    type: string\n  name:\n    type: string\n  description:\n    type: string\n  when_to_use:\n    type: array\n    items:\n      type: string\n  workflow:\n    type: array\n    items:\n      type: string\n  inputs:\n    type: array\n    items:\n      type: string\n  outputs:\n    type: array\n    items:\n      type: string\n  references:\n    type: array\n    items:\n      type: string\n`,
  );

  await writeIfMissing(
    path.join(PATHS.canonicalSchemas, 'agent.schema.yaml'),
    `type: object\nrequired:\n  - id\n  - name\n  - purpose\n  - when_to_delegate\n  - checklist\n  - report_format\n  - tool_limits\nproperties:\n  id:\n    type: string\n  name:\n    type: string\n  purpose:\n    type: string\n  when_to_delegate:\n    type: array\n    items:\n      type: string\n  checklist:\n    type: array\n    items:\n      type: string\n  report_format:\n    type: string\n  tool_limits:\n    type: array\n    items:\n      type: string\n`,
  );
}

async function ensureCanonicalStructure() {
  await ensureDir(PATHS.canonicalRules);
  await ensureDir(PATHS.canonicalSkills);
  await ensureDir(PATHS.canonicalAgents);
  await writeCanonicalBaseDocs();

  await bootstrapCanonicalRules();
  await bootstrapCanonicalSkills();
  await bootstrapCanonicalAgents();
}

function renderCursorSkillsReadme(canonicalSkills, canonicalAgents) {
  const lines = ['# Methodology Rules skills', ''];
  lines.push('This directory contains specialized skills for the Methodology Rules project.');
  lines.push('Generated by `pnpm ai:sync`.');
  lines.push('');
  lines.push('## Available skills');
  lines.push('');

  for (const skill of canonicalSkills) {
    const id = String(skill.data.id);
    const desc = skill.data.description || '';
    lines.push(`### \`${id}\``);
    lines.push('');
    lines.push(`- **Use for**: ${desc}`);
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  lines.push(
    '- **Rules** (`.cursor/rules/`) are standards and constraints that auto-apply by file glob. Canonical source: `.ai/rules/`.',
  );
  lines.push(
    '- **Skills** (`.cursor/skills/`) are playbooks invoked for specific tasks. Canonical source: `.ai/capabilities/skills/`.',
  );
  lines.push(
    `- **Agents** (\`.cursor/agents/\`) are specialized personas (${canonicalAgents.map((a) => a.data.id).join(', ')}). Canonical source: \`.ai/capabilities/agents/\`.`,
  );

  return lines.join('\n');
}

async function generateCursorArtifacts(canonicalRules, canonicalSkills, canonicalAgents) {
  for (const rule of canonicalRules) {
    const target = path.join(PATHS.cursorRules, `${rule.data.id}.mdc`);
    await writeFile(target, renderCursorRule(rule));
  }

  for (const skill of canonicalSkills) {
    const target = path.join(PATHS.cursorSkills, String(skill.data.id), 'SKILL.md');
    await writeFile(target, renderSkillFile(skill));
  }

  for (const agent of canonicalAgents) {
    const target = path.join(PATHS.cursorAgents, `${agent.data.id}.md`);
    await writeFile(target, renderAgentFile(agent));
  }

  await writeFile(
    path.join(PATHS.cursorSkills, 'README.md'),
    renderCursorSkillsReadme(canonicalSkills, canonicalAgents),
  );
}

async function generateClaudeArtifacts(canonicalRules, canonicalSkills, canonicalAgents) {
  await writeFile(
    path.join(PATHS.claudeRoot, 'settings.json'),
    JSON.stringify(
      {
        permissions: {
          allow: [
            'Bash(ls:*)',
            'Bash(find:*)',
            'Bash(rg:*)',
            'Bash(cat:*)',
            'Bash(sed:*)',
            'Bash(git status:*)',
            'Bash(git diff:*)',
            'Bash(git log:*)',
            'Bash(pnpm test:*)',
            'Bash(pnpm lint:*)',
            'Bash(pnpm ts:*)',
            'Bash(pnpm build-lambda:*)',
            'Bash(pnpm nx:*)',
            'Bash(pnpm ai\\:check:*)',
            'Bash(pnpm ai\\:sync:*)',
            'Bash(npx prettier:*)',
            'Bash(npx eslint:*)',
          ],
        },
      },
      null,
      2,
    ),
  );

  for (const skill of canonicalSkills) {
    const target = path.join(PATHS.claudeSkills, String(skill.data.id), 'SKILL.md');
    await writeFile(target, renderSkillFile(skill));
  }

  for (const rule of canonicalRules) {
    const target = path.join(PATHS.claudeSkills, `rule-${rule.data.id}`, 'SKILL.md');
    await writeFile(target, renderRuleSkillFile(rule));
  }

  for (const agent of canonicalAgents) {
    const target = path.join(PATHS.claudeAgents, `${agent.data.id}.md`);
    await writeFile(target, renderAgentFile(agent));
  }
}

async function generateCodexArtifacts(canonicalRules, canonicalSkills, canonicalAgents) {
  for (const skill of canonicalSkills) {
    const target = path.join(PATHS.codexSkills, String(skill.data.id), 'SKILL.md');
    await writeFile(target, renderSkillFile(skill));
  }

  for (const rule of canonicalRules) {
    const target = path.join(PATHS.codexSkills, `rule-${rule.data.id}`, 'SKILL.md');
    await writeFile(target, renderRuleSkillFile(rule));
  }

  for (const agent of canonicalAgents) {
    const target = path.join(PATHS.codexSkills, String(agent.data.id), 'SKILL.md');
    await writeFile(target, renderAgentAsCodexSkill(agent));
  }
}

function checkbox(value) {
  return value ? 'Yes' : 'No';
}

async function generateParityMatrix(canonicalRules, canonicalSkills, canonicalAgents) {
  const lines = [];

  lines.push('# Parity matrix');
  lines.push('');
  lines.push('Generated by `pnpm ai:sync`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Canonical rules: ${canonicalRules.length}`);
  lines.push(`- Canonical skills: ${canonicalSkills.length}`);
  lines.push(`- Canonical agents: ${canonicalAgents.length}`);
  lines.push('');

  lines.push('## Skills parity');
  lines.push('');
  lines.push('| Skill | Cursor | Claude | Codex |');
  lines.push('| --- | --- | --- | --- |');

  for (const skill of canonicalSkills) {
    const id = String(skill.data.id);
    const cursorExists = await pathExists(path.join(PATHS.cursorSkills, id, 'SKILL.md'));
    const claudeExists = await pathExists(path.join(PATHS.claudeSkills, id, 'SKILL.md'));
    const codexExists = await pathExists(path.join(PATHS.codexSkills, id, 'SKILL.md'));
    lines.push(
      `| ${id} | ${checkbox(cursorExists)} | ${checkbox(claudeExists)} | ${checkbox(codexExists)} |`,
    );
  }

  lines.push('');
  lines.push('## Agents parity');
  lines.push('');
  lines.push('| Agent | Cursor agent | Claude agent | Codex skill mapping |');
  lines.push('| --- | --- | --- | --- |');

  for (const agent of canonicalAgents) {
    const id = String(agent.data.id);
    const cursorExists = await pathExists(path.join(PATHS.cursorAgents, `${id}.md`));
    const claudeExists = await pathExists(path.join(PATHS.claudeAgents, `${id}.md`));
    const codexExists = await pathExists(path.join(PATHS.codexSkills, id, 'SKILL.md'));
    lines.push(
      `| ${id} | ${checkbox(cursorExists)} | ${checkbox(claudeExists)} | ${checkbox(codexExists)} |`,
    );
  }

  lines.push('');
  lines.push('## Rules parity');
  lines.push('');
  lines.push('| Rule | Cursor rule | Claude skill mapping | Codex skill mapping |');
  lines.push('| --- | --- | --- | --- |');

  for (const rule of canonicalRules) {
    const id = String(rule.data.id);
    const cursorExists = await pathExists(path.join(PATHS.cursorRules, `${id}.mdc`));
    const claudeExists = await pathExists(path.join(PATHS.claudeSkills, `rule-${id}`, 'SKILL.md'));
    const codexExists = await pathExists(path.join(PATHS.codexSkills, `rule-${id}`, 'SKILL.md'));
    lines.push(
      `| ${id} | ${checkbox(cursorExists)} | ${checkbox(claudeExists)} | ${checkbox(codexExists)} |`,
    );
  }

  await writeFile(PATHS.parityMatrix, `${lines.join('\n')}\n`);
}

async function generateRootAdapters(canonicalRules, canonicalSkills, canonicalAgents) {
  const sharedLinks = [
    '- `.ai/README.md`',
    '- `.ai/DEFINITIONS.md`',
    '- `.ai/STANDARDS.md`',
    '- `.ai/PARITY_MATRIX.md`',
    '- `.ai/PROJECT_CONTEXT.md`',
  ].join('\n');

  const skillsList = canonicalSkills
    .map((s) => `- \`${s.data.id}\` - ${s.data.description || s.data.id}`)
    .join('\n');
  const rulesList = canonicalRules
    .map((r) => `- \`rule-${r.data.id}\` - ${r.data.intent || r.data.id}`)
    .join('\n');
  const agentsList = canonicalAgents
    .map((a) => `- \`${a.data.id}\` - ${a.data.purpose || a.data.id}`)
    .join('\n');

  const agentsContent = `# AGENTS.md

Methodology Rules AI instructions for Codex, Claude, and Cursor with equal capability parity.

## Equality rule

- Cursor, Claude, and Codex are treated as equals.
- No platform is primary for instruction definition.
- Canonical source: \`.ai/\`.

## Canonical workflow

1. Edit canonical files in \`.ai/\`.
2. Run \`pnpm ai:sync\` to regenerate platform adapters.
3. Run \`pnpm ai:check\` to validate parity and links.

## Current capability counts

- Rules: ${canonicalRules.length}
- Skills: ${canonicalSkills.length}
- Agents/Roles: ${canonicalAgents.length}

## Available skills

${skillsList}

## Rule mappings

${rulesList}

## Agent roles

${agentsList}

## Canonical references

${sharedLinks}

## Runtime adapter paths

- Cursor: \`.cursor/rules/\`, \`.cursor/skills/\`, \`.cursor/agents/\`
- Claude: \`.claude/settings.json\`, \`.claude/skills/\`, \`.claude/agents/\`
- Codex: \`.agents/skills/\`, \`AGENTS.md\`
`;

  const claudeContent = `# CLAUDE.md

Claude adapter for Methodology Rules AI instructions. This file is generated from canonical \`.ai/\`.

## Equality rule

- Cursor, Claude, and Codex are configured as equals.
- Capability parity is mandatory across all three.
- Canonical source remains tool-agnostic in \`.ai/\`.

## Claude runtime

- Baseline settings: \`.claude/settings.json\`
- Skills: \`.claude/skills/*/SKILL.md\`
- Agents: \`.claude/agents/*.md\`

## Required workflow

1. Update canonical docs under \`.ai/\`.
2. Run \`pnpm ai:sync\`.
3. Run \`pnpm ai:check\`.

## Canonical references

${sharedLinks}

## Capability counts

- Rules: ${canonicalRules.length}
- Skills: ${canonicalSkills.length}
- Agents/Roles: ${canonicalAgents.length}
`;

  const projectContextContent = (await pathExists(PATHS.projectContext))
    ? (await fs.readFile(PATHS.projectContext, 'utf8')).trim()
    : null;

  const claudeFinal = projectContextContent
    ? `${claudeContent.trimEnd()}\n\n${projectContextContent}\n`
    : claudeContent;

  const agentsFinal = projectContextContent
    ? `${agentsContent.trimEnd()}\n\n${projectContextContent}\n`
    : agentsContent;

  await writeFile(PATHS.rootAgents, agentsFinal);
  await writeFile(PATHS.rootClaude, claudeFinal);
}

async function removeStaleAdapters(canonicalRules, canonicalSkills, canonicalAgents) {
  const validSkillAndAgentIds = new Set([
    ...canonicalSkills.map((s) => String(s.data.id)),
    ...canonicalAgents.map((a) => String(a.data.id)),
  ]);
  const validRuleIds = new Set(canonicalRules.map((r) => String(r.data.id)));
  const validRuleSkillDirs = new Set(canonicalRules.map((r) => `rule-${r.data.id}`));

  for (const baseDir of [PATHS.cursorSkills, PATHS.claudeSkills, PATHS.codexSkills]) {
    if (!(await pathExists(baseDir))) continue;
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const id = entry.name;
      if (id.startsWith('rule-')) {
        if (validRuleSkillDirs.has(id)) continue;
      } else if (validSkillAndAgentIds.has(id)) {
        continue;
      }
      const staleDir = path.join(baseDir, id);
      if (!DRY_RUN) {
        await fs.rm(staleDir, { recursive: true });
      }
      log(`removed stale adapter: ${path.relative(ROOT, staleDir)}`);
    }
  }

  if (await pathExists(PATHS.cursorRules)) {
    const ruleFiles = await fs.readdir(PATHS.cursorRules, { withFileTypes: true });
    for (const entry of ruleFiles) {
      if (!entry.isFile() || !entry.name.endsWith('.mdc')) continue;
      const id = entry.name.replace(/\.mdc$/, '');
      if (validRuleIds.has(id)) continue;
      const stalePath = path.join(PATHS.cursorRules, entry.name);
      if (!DRY_RUN) {
        await fs.unlink(stalePath);
      }
      log(`removed stale adapter: ${path.relative(ROOT, stalePath)}`);
    }
  }

  const validAgentIds = new Set(canonicalAgents.map((a) => String(a.data.id)));
  for (const agentsDir of [PATHS.cursorAgents, PATHS.claudeAgents]) {
    if (!(await pathExists(agentsDir))) continue;
    const files = await fs.readdir(agentsDir, { withFileTypes: true });
    for (const entry of files) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const id = entry.name.replace(/\.md$/, '');
      if (validAgentIds.has(id)) continue;
      const stalePath = path.join(agentsDir, entry.name);
      if (!DRY_RUN) {
        await fs.unlink(stalePath);
      }
      log(`removed stale adapter: ${path.relative(ROOT, stalePath)}`);
    }
  }
}

async function main() {
  await ensureCanonicalStructure();

  const canonicalRules = await loadCanonicalFiles(PATHS.canonicalRules);
  const canonicalSkills = await loadCanonicalFiles(PATHS.canonicalSkills);
  const canonicalAgents = await loadCanonicalFiles(PATHS.canonicalAgents);

  await generateCursorArtifacts(canonicalRules, canonicalSkills, canonicalAgents);
  await generateClaudeArtifacts(canonicalRules, canonicalSkills, canonicalAgents);
  await generateCodexArtifacts(canonicalRules, canonicalSkills, canonicalAgents);
  await generateParityMatrix(canonicalRules, canonicalSkills, canonicalAgents);
  await generateRootAdapters(canonicalRules, canonicalSkills, canonicalAgents);
  await removeStaleAdapters(canonicalRules, canonicalSkills, canonicalAgents);

  log('ai sync complete');
  log(`rules: ${canonicalRules.length}`);
  log(`skills: ${canonicalSkills.length}`);
  log(`agents: ${canonicalAgents.length}`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
