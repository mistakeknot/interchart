#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || path.resolve(__dirname, '../../..');

const nodes = [];
const edges = [];
const nodeIds = new Set();

function addNode(id, type, label, description, meta = {}) {
  if (nodeIds.has(id)) return;
  nodeIds.add(id);
  nodes.push({ id, type, label, description: description || '', meta });
}

function addEdge(source, target, type) {
  if (!nodeIds.has(source) || !nodeIds.has(target)) return;
  edges.push({ source, target, type });
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
    path: path.relative(ROOT, pluginDir)
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
        path: path.relative(ROOT, skillDir)
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
            path: path.relative(ROOT, fullSkillDir)
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
        path: agentRef
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
        command: config.command
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
        addNode(hookId, 'hook-event', eventName, `Hook event: ${eventName}`, {});
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
      edges.push({ source: manifest.name, target: 'clavain', type: 'companion-of', _deferred: true });
    }
  }
}

// --- Main scan ---

// 1. Monorepo root node
addNode('interverse', 'monorepo', 'Interverse', 'Monorepo for the inter-module ecosystem');

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
  path: 'infra/intercore'
});
addEdge('intercore', 'interverse', 'part-of');

addNode('intermute-service', 'service', 'Intermute', 'Multi-agent coordination service (Go)', {
  path: 'services/intermute'
});
addEdge('intermute-service', 'interverse', 'part-of');

addNode('interbase-sdk', 'sdk', 'Interbase', 'Shared integration SDK for dual-mode plugins', {
  path: 'sdk/interbase'
});
addEdge('interbase-sdk', 'interverse', 'part-of');

// Autarch / Interforge
const interforgeDir = path.join(ROOT, 'Interforge');
try {
  fs.statSync(interforgeDir);
  addNode('autarch', 'tui', 'Autarch', 'TUI frontend — desktop application for the agent rig', {
    path: 'Interforge'
  });
  addEdge('autarch', 'interverse', 'part-of');
  addEdge('autarch', 'intercore', 'depends-on');
} catch {
  process.stderr.write('warn: Interforge dir not found, adding Autarch as external ref\n');
  addNode('autarch', 'tui', 'Autarch', 'TUI frontend (external)', {});
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

// 6. Resolve deferred companion edges
const resolvedEdges = edges.filter(e => {
  if (e._deferred) {
    if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
      delete e._deferred;
      return true;
    }
    return false;
  }
  return true;
});

// Output
const output = {
  generated: new Date().toISOString(),
  stats: {
    nodes: nodes.length,
    edges: resolvedEdges.length,
    byType: {}
  },
  nodes,
  edges: resolvedEdges
};

// Compute stats by type
for (const n of nodes) {
  output.stats.byType[n.type] = (output.stats.byType[n.type] || 0) + 1;
}

process.stdout.write(JSON.stringify(output, null, 2) + '\n');
