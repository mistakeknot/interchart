#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || path.resolve(__dirname, '../../..');

const nodes = [];
const edges = [];
const nodeIds = new Set();
const edgeIds = new Set();
const CLAUDE_CODE_HOOKS_DOCS_URL = 'https://docs.anthropic.com/en/docs/claude-code/hooks';
const REPO_NAME_OVERRIDES = {
  interverse: 'Interverse',
  clavain: 'Clavain',
  autarch: 'Autarch'
};

const OVERLAP_DOMAIN_RULES = [
  {
    domain: 'analytics-observability',
    weight: 1.2,
    patterns: [/\banalytics?\b/i, /\btelemetry\b/i, /\bmetrics?\b/i, /\bbenchmark/i, /\bmonitoring\b/i, /\busage\b/i, /\bstatusline\b/i, /\bhealth\b/i]
  },
  {
    domain: 'quality-review',
    weight: 1.2,
    patterns: [/\bquality\b/i, /\breview\b/i, /\baudit\b/i, /\bverification\b/i, /\bguard(s)?\b/i, /\btest(s|ing)?\b/i]
  },
  {
    domain: 'docs-artifacts',
    weight: 1.1,
    patterns: [/\bdoc(s|umentation)?\b/i, /\broadmap\b/i, /\bprd\b/i, /\bartifact\b/i, /\bchangelog\b/i, /\bfreshness\b/i, /\bdrift\b/i, /\bmemory\b/i, /\bnotion\b/i]
  },
  {
    domain: 'discovery-research',
    weight: 1.1,
    patterns: [/\bsearch\b/i, /\bdiscovery\b/i, /\bresearch\b/i, /\bembedding\b/i, /\bretrieval\b/i, /\bsemantic\b/i]
  },
  {
    domain: 'phase-gates',
    weight: 1.3,
    patterns: [/\bphase(s)?\b/i, /\bgate(s|d|ing)?\b/i, /\bsprint\b/i, /\blifecycle\b/i]
  },
  {
    domain: 'coordination-dispatch',
    weight: 1.0,
    patterns: [/\bcoordination\b/i, /\bdispatch(es|ed)?\b/i, /\breserv(e|ation|ing)\b/i, /\bconflict\b/i, /\bmessaging\b/i]
  },
  {
    domain: 'design-product',
    weight: 0.9,
    patterns: [/\bdesign\b/i, /\bvisual\b/i, /\bui\b/i, /\bproduct\b/i]
  },
  {
    domain: 'release-publish',
    weight: 1.0,
    patterns: [/\brelease\b/i, /\bpublish(ing)?\b/i, /\bversion\b/i, /\bmarketplace\b/i]
  }
];

const FORCED_OVERLAP_GROUPS = [
  { domain: 'analytics-quality-stack', boost: 1.1, ids: ['intercheck', 'interstat', 'tool-time'] },
  { domain: 'doc-lifecycle-stack', boost: 0.9, ids: ['interwatch', 'interdoc', 'interpath', 'intermem', 'interkasten'] },
  { domain: 'phase-gate-control', boost: 1.4, ids: ['interphase', 'intercore', 'clavain'] },
  { domain: 'discovery-context-stack', boost: 0.8, ids: ['interflux', 'interject', 'intersearch', 'tldr-swinton', 'intermap'] }
];

function addNode(id, type, label, description, meta = {}) {
  if (nodeIds.has(id)) return;
  nodeIds.add(id);
  nodes.push({ id, type, label, description: description || '', meta });
}

function repoUrlForName(name) {
  if (!name) return '';
  const repoName = REPO_NAME_OVERRIDES[name] || name;
  return `https://github.com/mistakeknot/${repoName}`;
}

function addEdge(source, target, type, meta = {}) {
  if (!nodeIds.has(source) || !nodeIds.has(target)) return;
  const key = `${source}->${target}:${type}`;
  if (edgeIds.has(key)) return;
  edgeIds.add(key);
  const edge = { source, target, type };
  if (meta && Object.keys(meta).length > 0) edge.meta = meta;
  edges.push(edge);
}

function addDeferredEdge(source, target, type, meta = {}) {
  const edge = { source, target, type, _deferred: true };
  if (meta && Object.keys(meta).length > 0) edge.meta = meta;
  edges.push(edge);
}

function buildOverlapText(node) {
  const parts = [node.id, node.label, node.description];
  if (node.meta && node.meta.path) parts.push(node.meta.path);
  if (node.meta && node.meta.plugin) parts.push(node.meta.plugin);
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function inferOverlapDomains(node) {
  const text = buildOverlapText(node);
  const domains = new Map();
  for (const rule of OVERLAP_DOMAIN_RULES) {
    if (rule.patterns.some(re => re.test(text))) {
      domains.set(rule.domain, rule.weight);
    }
  }
  return domains;
}

function getForcedOverlapSignals(sourceId, targetId) {
  const domains = [];
  let boost = 0;
  for (const group of FORCED_OVERLAP_GROUPS) {
    if (group.ids.includes(sourceId) && group.ids.includes(targetId)) {
      domains.push(group.domain);
      boost += group.boost;
    }
  }
  return { domains, boost };
}

function computeOverlapEdges() {
  const candidates = nodes.filter(n => (
    n.type === 'plugin' ||
    n.type === 'hub' ||
    n.type === 'kernel' ||
    n.type === 'service' ||
    n.type === 'sdk' ||
    n.type === 'tui'
  ));

  const domainMap = new Map();
  for (const node of candidates) {
    domainMap.set(node.id, inferOverlapDomains(node));
  }

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const aDomains = domainMap.get(a.id);
      const bDomains = domainMap.get(b.id);
      const sharedDomains = [];
      let score = 0;

      for (const [domain, weight] of aDomains.entries()) {
        if (bDomains.has(domain)) {
          sharedDomains.push(domain);
          score += Math.min(weight, bDomains.get(domain));
        }
      }

      const forced = getForcedOverlapSignals(a.id, b.id);
      const allDomains = Array.from(new Set(sharedDomains.concat(forced.domains)));
      const totalScore = Number((score + forced.boost).toFixed(2));
      const qualifies =
        forced.domains.length > 0 ||
        sharedDomains.length >= 2 ||
        totalScore >= 2.4;

      if (!qualifies || allDomains.length === 0) continue;

      addEdge(a.id, b.id, 'overlaps-with', {
        score: totalScore,
        domains: allDomains
      });
    }
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return null;
    const fm = match[1];
    const name = (fm.match(/^name:\s*(.+)$/m) || [])[1]?.trim();
    // Support both single-line and multi-line (quoted) descriptions
    let desc = (fm.match(/^description:\s*"([^"]+)"/m) || [])[1]?.trim()
      || (fm.match(/^description:\s*(.+)$/m) || [])[1]?.trim();
    return { name, description: desc };
  } catch {
    return null;
  }
}

function readSkillFrontmatter(skillDir) {
  return readFrontmatter(path.join(skillDir, 'SKILL.md'));
}

function scanPluginDir(pluginDir, pluginName, isHub = false) {
  const manifestPath = path.join(pluginDir, '.claude-plugin', 'plugin.json');
  const manifest = readJson(manifestPath);
  if (!manifest) {
    process.stderr.write(`warn: no manifest at ${manifestPath}\n`);
    return;
  }

  const nodeType = isHub ? 'hub' : 'plugin';
  addNode(manifest.name, nodeType, manifest.name, manifest.description, {
    version: manifest.version,
    path: path.relative(ROOT, pluginDir),
    repoUrl: repoUrlForName(manifest.name)
  });

  // Skills
  if (manifest.skills && Array.isArray(manifest.skills)) {
    for (const skillRef of manifest.skills) {
      const skillPath = path.resolve(pluginDir, '.claude-plugin', skillRef);
      // skillRef is relative to .claude-plugin — resolve from there
      const resolved = path.resolve(path.join(pluginDir, '.claude-plugin'), skillRef);
      let skillDir = resolved;
      // Check if it's a directory or file
      try {
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) skillDir = path.dirname(resolved);
      } catch {
        // Try resolving from plugin root instead
        skillDir = path.resolve(pluginDir, skillRef);
      }
      const fm = readSkillFrontmatter(skillDir);
      const skillName = fm?.name || path.basename(skillDir);
      const skillId = `${manifest.name}:${skillName}`;
      addNode(skillId, 'skill', skillName, fm?.description || '', {
        plugin: manifest.name,
        path: path.relative(ROOT, skillDir),
        repoUrl: repoUrlForName(manifest.name)
      });
      addEdge(manifest.name, skillId, 'provides-skill');
    }
  }

  // Also scan skills directory directly for hub (Clavain has skills not listed in manifest)
  if (isHub) {
    const skillsDir = path.join(pluginDir, 'skills');
    try {
      const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true });
      for (const entry of skillDirs) {
        if (!entry.isDirectory()) continue;
        const fullSkillDir = path.join(skillsDir, entry.name);
        const fm = readSkillFrontmatter(fullSkillDir);
        const skillName = fm?.name || entry.name;
        const skillId = `${manifest.name}:${skillName}`;
        if (!nodeIds.has(skillId)) {
          addNode(skillId, 'skill', skillName, fm?.description || '', {
            plugin: manifest.name,
            path: path.relative(ROOT, fullSkillDir),
            repoUrl: repoUrlForName(manifest.name)
          });
          addEdge(manifest.name, skillId, 'provides-skill');
        }
      }
    } catch { /* no skills dir */ }
  }

  // Agents — read frontmatter for descriptions
  if (manifest.agents && Array.isArray(manifest.agents)) {
    for (const agentRef of manifest.agents) {
      const agentName = path.basename(agentRef, '.md');
      const agentId = `${manifest.name}:agent:${agentName}`;
      const agentPath = path.join(pluginDir, agentRef);
      const agentFm = readFrontmatter(agentPath);
      const agentDesc = agentFm?.description || '';
      addNode(agentId, 'agent', agentName, agentDesc, {
        plugin: manifest.name,
        path: agentRef,
        repoUrl: repoUrlForName(manifest.name)
      });
      addEdge(manifest.name, agentId, 'provides-agent');
    }
  }

  // MCP Servers
  if (manifest.mcpServers && typeof manifest.mcpServers === 'object') {
    for (const [serverName, config] of Object.entries(manifest.mcpServers)) {
      const serverId = `mcp:${manifest.name}:${serverName}`;
      const mcpDesc = `MCP server for ${manifest.name} — provides ${serverName} tools via ${config.type || 'stdio'}`;
      addNode(serverId, 'mcp-server', serverName, mcpDesc, {
        plugin: manifest.name,
        type: config.type,
        command: config.command,
        repoUrl: repoUrlForName(manifest.name)
      });
      addEdge(manifest.name, serverId, 'provides-mcp');
    }
  }

  // Hooks
  const hooksJsonPath = path.join(pluginDir, 'hooks', 'hooks.json');
  const hooksData = readJson(hooksJsonPath);
  if (hooksData && hooksData.hooks) {
    for (const eventName of Object.keys(hooksData.hooks)) {
      const hookId = `hook:${eventName}`;
      if (!nodeIds.has(hookId)) {
        const hookDescs = {
          SessionStart: 'Fires when a Claude Code session begins — initialize state, check prerequisites, load context',
          SessionEnd: 'Fires when a session ends — persist state, sync data, clean up resources',
          PreToolUse: 'Fires before a tool executes — validate, intercept, or modify tool calls',
          PostToolUse: 'Fires after a tool executes — audit results, trigger follow-up actions',
          Stop: 'Fires when Claude Code stops — handoff checks, session summaries, final sync'
        };
        addNode(hookId, 'hook-event', eventName, hookDescs[eventName] || `Hook event: ${eventName}`, {
          docsUrl: CLAUDE_CODE_HOOKS_DOCS_URL
        });
      }
      addEdge(manifest.name, hookId, 'fires-hook');
    }
  }

  // Commands (count only — too many to show individually)
  if (manifest.commands && Array.isArray(manifest.commands)) {
    const existing = nodes.find(n => n.id === manifest.name);
    if (existing) {
      existing.meta.commandCount = manifest.commands.length;
    }
  }

  // Companion detection
  if (manifest.description) {
    if (/companion\s+plugin\s+for\s+clavain/i.test(manifest.description)) {
      // Deferred — Clavain might not be added yet
      addDeferredEdge(manifest.name, 'clavain', 'companion-of');
    }
  }
}

// --- Main scan ---

// 1. Monorepo root node
addNode('interverse', 'monorepo', 'Interverse', 'Monorepo for the inter-module ecosystem', {
  repoUrl: repoUrlForName('interverse')
});

// 2. Scan all plugins
const pluginsDir = path.join(ROOT, 'plugins');
try {
  const pluginEntries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  for (const entry of pluginEntries) {
    if (!entry.isDirectory()) continue;
    // Skip interchart itself to avoid self-reference
    if (entry.name === 'interchart') continue;
    scanPluginDir(path.join(pluginsDir, entry.name), entry.name);
  }
} catch (e) {
  process.stderr.write(`warn: could not read plugins dir: ${e.message}\n`);
}

// 3. Scan Clavain hub
const clavainDir = path.join(ROOT, 'hub', 'clavain');
try {
  fs.statSync(clavainDir);
  scanPluginDir(clavainDir, 'clavain', true);
} catch {
  process.stderr.write('warn: hub/clavain not found\n');
}

// 4. Fixed infrastructure nodes
addNode('intercore', 'kernel', 'Intercore', 'Kernel — phases, gates, runs, dispatches, state machine', {
  path: 'infra/intercore',
  repoUrl: repoUrlForName('intercore')
});
addEdge('intercore', 'interverse', 'part-of');

addNode('intermute-service', 'service', 'Intermute', 'Multi-agent coordination service (Go)', {
  path: 'services/intermute',
  repoUrl: repoUrlForName('intermute')
});
addEdge('intermute-service', 'interverse', 'part-of');

addNode('interbase-sdk', 'sdk', 'Interbase', 'Shared integration SDK for dual-mode plugins', {
  path: 'sdk/interbase',
  repoUrl: repoUrlForName('interbase')
});
addEdge('interbase-sdk', 'interverse', 'part-of');

// Autarch / Interforge
const interforgeDir = path.join(ROOT, 'Interforge');
try {
  fs.statSync(interforgeDir);
  addNode('autarch', 'tui', 'Autarch', 'TUI frontend — desktop application for the agent rig', {
    path: 'Interforge',
    repoUrl: repoUrlForName('autarch')
  });
  addEdge('autarch', 'interverse', 'part-of');
  addEdge('autarch', 'intercore', 'depends-on');
} catch {
  process.stderr.write('warn: Interforge dir not found, adding Autarch as external ref\n');
  addNode('autarch', 'tui', 'Autarch', 'TUI frontend (external)', {
    repoUrl: repoUrlForName('autarch')
  });
}

// 5. Structural edges — hub and plugins are part of Interverse
if (nodeIds.has('clavain')) {
  addEdge('clavain', 'interverse', 'part-of');
  addEdge('clavain', 'intercore', 'depends-on');
}

for (const node of nodes) {
  if (node.type === 'plugin') {
    addEdge(node.id, 'interverse', 'part-of');
  }
}

// 6. Overlap edges (potential functional duplicates/adjacent capabilities)
computeOverlapEdges();

// 7. Resolve deferred edges and de-dupe
const resolvedEdges = [];
const resolvedEdgeIds = new Set();
for (const edge of edges) {
  if (edge._deferred && (!nodeIds.has(edge.source) || !nodeIds.has(edge.target))) continue;
  const cleanEdge = Object.assign({}, edge);
  delete cleanEdge._deferred;
  const key = `${cleanEdge.source}->${cleanEdge.target}:${cleanEdge.type}`;
  if (resolvedEdgeIds.has(key)) continue;
  resolvedEdgeIds.add(key);
  resolvedEdges.push(cleanEdge);
}

const nodeById = new Map(nodes.map(n => [n.id, n]));
const overlaps = resolvedEdges
  .filter(e => e.type === 'overlaps-with')
  .map(e => {
    const sourceNode = nodeById.get(e.source);
    const targetNode = nodeById.get(e.target);
    return {
      source: e.source,
      sourceLabel: sourceNode ? sourceNode.label : e.source,
      target: e.target,
      targetLabel: targetNode ? targetNode.label : e.target,
      score: e.meta && typeof e.meta.score === 'number' ? e.meta.score : 0,
      domains: e.meta && Array.isArray(e.meta.domains) ? e.meta.domains : []
    };
  })
  .sort((a, b) => b.score - a.score || a.source.localeCompare(b.source));

// ── Standardize descriptions ──
// Target: 40-120 chars, descriptive (not trigger-focused), sentence fragment

const CURATED_DESCRIPTIONS = {
  // Skills with empty or poor descriptions
  'intercheck:status': 'Session health dashboard — plugin errors, MCP status, hook failures',
  'interfluence:skills': 'Voice profile management — analyze writing samples, apply style adaptation',
  'interject:skills': 'Ambient research discovery — scan arXiv, HN, GitHub for relevant papers and tools',
  'interkasten:layout': 'Notion page layout optimization — structure and format synced documents',
  'interkasten:onboard': 'Notion workspace onboarding — connect databases, configure sync mappings',
  'interkasten:doctor': 'Notion sync diagnostics — check connection health, resolve sync conflicts',
  'interleave:interleave': 'Template-driven document generation — deterministic skeleton with LLM-filled islands',
  'intermap:skills': 'Code architecture mapping — call graphs, module boundaries, dependency analysis',
  'intermem:synthesize': 'Memory synthesis — graduate stable auto-memory facts to AGENTS.md and CLAUDE.md',
  'intermux:status': 'Agent activity dashboard — tmux sessions, heartbeats, resource usage',
  'interstat:skills': 'Token efficiency benchmarking — measure and compare agent cost patterns',
};

const MAX_DESC_LENGTH = 120;

for (const n of nodes) {
  // Apply curated descriptions for known empty/poor entries
  if (CURATED_DESCRIPTIONS[n.id]) {
    n.description = CURATED_DESCRIPTIONS[n.id];
  }
  // Clean up skill descriptions: strip "Use when..." prefix, make descriptive
  if (n.type === 'skill' && n.description) {
    n.description = n.description
      .replace(/^"/, '').replace(/"$/, '')  // strip wrapping quotes
      .replace(/^Use when\s+/i, '')
      .replace(/^This skill should be used when\s+/i, '')
      .replace(/\s+/g, ' ').trim();
    // Capitalize first letter
    if (n.description) n.description = n.description[0].toUpperCase() + n.description.slice(1);
  }
  // Clean up plugin descriptions: strip plugin name prefix, em-dashes
  if (n.type === 'plugin' && n.description) {
    n.description = n.description
      .replace(new RegExp('^' + n.label + '\\s*[—–-]\\s*', 'i'), '')
      .replace(/\s+/g, ' ').trim();
    if (n.description) n.description = n.description[0].toUpperCase() + n.description.slice(1);
  }
  // Truncate long descriptions
  if (n.description && n.description.length > MAX_DESC_LENGTH) {
    // Cut at last word boundary before limit
    let cut = n.description.lastIndexOf(' ', MAX_DESC_LENGTH);
    if (cut < 60) cut = MAX_DESC_LENGTH; // avoid too-short truncation
    n.description = n.description.slice(0, cut).replace(/[.,;:\s]+$/, '');
  }
}

// Output
const output = {
  generated: new Date().toISOString(),
  stats: {
    nodes: nodes.length,
    edges: resolvedEdges.length,
    overlaps: overlaps.length,
    byType: {}
  },
  nodes,
  edges: resolvedEdges,
  overlaps
};

// Compute stats by type
for (const n of nodes) {
  output.stats.byType[n.type] = (output.stats.byType[n.type] || 0) + 1;
}

process.stdout.write(JSON.stringify(output, null, 2) + '\n');
