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

function readSkillFrontmatter(skillDir) {
  const skillMd = path.join(skillDir, 'SKILL.md');
  try {
    const content = fs.readFileSync(skillMd, 'utf8');
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return null;
    const fm = match[1];
    const name = (fm.match(/^name:\s*(.+)$/m) || [])[1]?.trim();
    const desc = (fm.match(/^description:\s*(.+)$/m) || [])[1]?.trim();
    return { name, description: desc };
  } catch {
    return null;
  }
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

  // Agents
  if (manifest.agents && Array.isArray(manifest.agents)) {
    for (const agentRef of manifest.agents) {
      const agentName = path.basename(agentRef, '.md');
      const agentId = `${manifest.name}:agent:${agentName}`;
      addNode(agentId, 'agent', agentName, '', {
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
      addNode(serverId, 'mcp-server', serverName, `MCP server: ${config.type || 'stdio'}`, {
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
        addNode(hookId, 'hook-event', eventName, `Hook event: ${eventName}`, {
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
