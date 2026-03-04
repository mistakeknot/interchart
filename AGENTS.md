# interchart — AGENTS.md

## Canonical References
1. [`PHILOSOPHY.md`](../../PHILOSOPHY.md) — direction for ideation and planning decisions.
2. `CLAUDE.md` — implementation details, architecture, testing, and release workflow.

## Philosophy Alignment Protocol
Review [`PHILOSOPHY.md`](../../PHILOSOPHY.md) during:
- Intake/scoping
- Brainstorming
- Planning
- Execution kickoff
- Review/gates
- Handoff/retrospective

For brainstorming/planning outputs, add two short lines:
- **Alignment:** one sentence on how the proposal supports the module's purpose within Demarch's philosophy.
- **Conflict/Risk:** one sentence on any tension with philosophy (or 'none').

If a high-value change conflicts with philosophy, either:
- adjust the plan to align, or
- create follow-up work to update `PHILOSOPHY.md` explicitly.


Interactive ecosystem diagram generator for the Demarch monorepo. Scans all plugins, skills, agents, MCP servers, hooks, and infrastructure nodes and produces a self-contained D3.js force graph.

**Live diagram:** https://mistakeknot.github.io/interchart/

## Architecture

```
scripts/scan.js          → Scans monorepo, outputs JSON graph (nodes + edges)
scripts/generate.sh      → Runs scanner → injects JSON into HTML template → writes output
templates/ecosystem.html → D3.js force graph template with /*DATA_PLACEHOLDER*/ marker
scripts/regenerate-and-deploy.sh  → Generate + deploy to gh-pages branch
scripts/watch-and-deploy.sh       → Cron wrapper — fingerprint-based change detection
```

### Pipeline

```
scan.js ─→ JSON ─→ generate.sh ─→ ecosystem.html
                        │
              template + data injection
                        │
              (/*DATA_PLACEHOLDER*/ → JSON blob)
```

The generated HTML is fully self-contained — the only external dependency is the D3.js v7 CDN script.

## File Layout

```
.claude-plugin/plugin.json    → Plugin manifest (name, version, skills)
scripts/
  scan.js                     → Node.js scanner (455 lines)
  generate.sh                 → Generate HTML from template + scanned data
  regenerate-and-deploy.sh    → Full pipeline: generate → compare → deploy to gh-pages
  watch-and-deploy.sh         → Cron-friendly: SHA fingerprint → regenerate if changed
templates/
  ecosystem.html              → D3.js visualization template (~850 lines)
skills/interchart/SKILL.md    → Claude Code skill for /interchart command
.last-scan-state              → SHA256 fingerprint of last cron run (gitignored)
```

## Scanner Data Model (scan.js)

### Node Types

| Type | Description | Size | Example |
|------|-------------|------|---------|
| `monorepo` | Demarch root | 24 | Demarch |
| `ecosystem` | Interverse plugin ecosystem | 20 | Interverse |
| `hub` | Clavain hub | 20 | clavain |
| `kernel` | Intercore kernel | 16 | intercore |
| `service` | Go services | 14 | intermute |
| `tui` | TUI frontends | 14 | autarch |
| `sdk` | Shared SDKs | 12 | interbase |
| `plugin` | Claude Code plugins | 12 | interflux |
| `mcp-server` | MCP servers | 7 | serena |
| `hook-event` | Hook event types | 7 | PostToolUse |
| `agent` | Plugin agents | 6 | fd-architecture |
| `skill` | Plugin skills | 6 | flux-drive |

### Edge Types

| Type | Meaning | Visual |
|------|---------|--------|
| `part-of` | Structural containment | Solid gray |
| `provides-skill` | Plugin → skill | Solid green |
| `provides-agent` | Plugin → agent | Solid orange |
| `provides-mcp` | Plugin → MCP server | Dashed purple |
| `fires-hook` | Plugin → hook event | Dotted red |
| `companion-of` | Plugin → hub companion | Dashed yellow |
| `depends-on` | Hard dependency | Dashed teal |
| `overlaps-with` | Functional overlap | Not rendered as edges (see Domains) |
| `participates-in` | Sprint phase → ecosystem plugin | Dashed cyan (injected dynamically) |

### Overlap / Domain System

Overlap edges are **not drawn as edges** — they're visualized as **convex hull domain overlays**. Each domain is a colored translucent polygon enclosing all plugins that share that capability area.

**How overlaps are computed** (in `computeOverlapEdges()`):

1. Each plugin/hub/kernel/service node gets its description text matched against `OVERLAP_DOMAIN_RULES` (regex patterns → domain names with weights)
2. `FORCED_OVERLAP_GROUPS` add curated groupings (e.g., analytics stack, doc lifecycle)
3. Two nodes overlap if they share 2+ domains OR score >= 2.4 OR belong to a forced group

**Current domains** (11): analytics-observability, analytics-quality-stack, coordination-dispatch, design-product, discovery-context-stack, discovery-research, doc-lifecycle-stack, docs-artifacts, phase-gate-control, phase-gates, quality-review

To add a domain: add a rule to `OVERLAP_DOMAIN_RULES` in `scan.js` or a group to `FORCED_OVERLAP_GROUPS`.

## Visualization (ecosystem.html)

### Toggle Architecture

The app uses a **unified force graph** with two independent toggle buttons in the toolbar, plus **workflow view selectors** (visible when Sprint is ON):

| Toggle | Content | Default |
|--------|---------|---------|
| **Ecosystem** | D3.js force-directed graph of all Demarch modules | ON |
| **Sprint** | Sprint workflow visualization | ON |

| Selector | Options | Default | Visible when |
|----------|---------|---------|-------------|
| **View Mode** | Force Graph, Swimlane, Sankey Flow, State Machine | Swimlane | Sprint ON |
| **Depth** | 1 (Plugins), 2 (Skills/Agents), 3 (Full Trace) | 2 | Sprint ON |

Both toggles can be active simultaneously. When both are on with Force Graph view, sprint phases become gravitational anchors in the force simulation.

**View modes** (mutually exclusive):
- **Force Graph**: Original pinned phase nodes + `participates-in` edges in D3 force simulation
- **Swimlane** (default): Phases as columns, entities as rows, artifact flow arrows between phases
- **Sankey Flow**: Phase columns with proportional flow bands, cubic bezier paths between matching entities
- **State Machine**: Elliptical arc layout with animated transitions, click-to-expand drill-down

**Depth levels** (switchable, affects all non-force views):
- **1**: Phase → Plugins only (from `PHASE_PLUGINS`)
- **2**: Phase → Skills/Agents/MCP (from `PHASE_SKILLS`)
- **3**: Full trace: hooks, artifacts, MCP tools, data contracts (from `WORKFLOW_TRACE`)

**Toggle behavior** (`toggleLayer()` — monkey-patched):
- Each button toggles independently (not mutually exclusive)
- Ecosystem ON/OFF: shows/hides ecosystem nodes, links, search box, sidebar toggle, stats
- Sprint ON/OFF: shows/hides view-mode and depth selectors, dispatches to appropriate renderer
- `rebuildGraph()` dispatches: force → original path, others → static SVG renderers
- Sprint phase filter section in sidebar appears when sprint is active
- Non-force views stop the force simulation and reset zoom for static layout

**Phase-to-plugin mapping** (`PHASE_PLUGINS`): Curated static mapping of which ecosystem nodes participate in each sprint phase. Creates `participates-in` force links when both toggles are active.

**Workflow trace data** (`WORKFLOW_TRACE`): Depth-3 data curated per phase: hooks[], artifactIn, artifactOut, mcpTools[], dataContracts[]. Used by `getPhaseEntities(phaseId, depth)` and `getAllWorkflowEntities(depth)`.

### UI Layout

- **Toolbar** (top, 44px): "Demarch" title, toggle bar (Ecosystem/Sprint), view-mode select, depth select, stats, search box
- **Sidebar toggle** (fixed position, top-left): Hamburger button to expand filter sidebar
- **Filter sidebar** (left, 240px, overlay): Type filters + domain hull toggles + sprint phase toggles (when sprint active). Starts collapsed.
- **Graph area** (center): Single D3.js force-directed SVG (full viewport)
- **Detail panel** (right, slides in): Shows node metadata for both ecosystem and sprint nodes

### Sprint Nodes in Force Graph

Sprint phase nodes are rendered as **rounded rectangles** (160×56px) in a separate SVG layer on top of the force graph. They are **pinned** (fixed `fx`/`fy`) in a horizontal arc:

```
Top row (steps 1-5):    [Brainstorm] [Strategize] [Write Plan] [Review Plan] [Execute]
Bottom row (steps 6-10): [Test] [Quality Gates] [Resolve] [Reflect] [Ship]
```

**Visual elements**:
- Rounded rect nodes with step number badge, label, phase name, and artifact hint
- Blue flow arrows between consecutive phases (decorative SVG layer, not force links)
- Dashed orange skip arc: Brainstorm → Write Plan for trivial tasks
- Gate diamonds on flow arrows: red = hard gate (blocking), orange = soft gate (advisory)
- Dashed teal `participates-in` edges from phase nodes to ecosystem plugins (force links)

**Phase colors**: ideation=#F39C12, planning=#3498DB, building=#2ECC71, quality=#E74C3C, learning=#9B59B6, shipping=#1ABC9C

**Sprint data**: `var SPRINT_PHASES` — 10-element array, each with `{id, step, label, phase, command, description, artifact, gate}`. Fully static — no scanning needed.

### Interactions

- **Click ecosystem node**: Highlight node + neighbors + connected sprint phases, dim everything else, open detail panel
- **Click sprint phase node**: Highlight phase + participating plugins + adjacent phases, open detail panel with command, artifact, gate info, and participating plugins list
- **Click background**: Deselect all, close panel
- **Search** (when ecosystem active): Filter + highlight matching nodes by name/ID
- **Type filters**: Show/hide node types (sidebar checkboxes)
- **Domain toggles**: Show/hide convex hull overlays per domain
- **Phase toggles** (when sprint active): Show/hide individual sprint phase nodes
- **Drag**: Reposition ecosystem nodes (sprint phases stay pinned)
- **Zoom/pan**: Mouse wheel + drag on background
- **Detail panel links**: Click to navigate to connected nodes; external links to GitHub repos

### Template Variable Ordering

The template uses inline `<script>` with `const`/`let` — these are NOT hoisted. Variables must be defined before first use. Current safe order:

```
1. TYPE_COLORS, TYPE_SIZES, TYPE_LABELS (constants)
2. activeFilters, selectedNode, searchQuery (state)
3. Build type filter buttons (reads TYPE_*)
4. graphNodes, graphLinks (from data — filters out overlaps-with)
5. domainMembers, DOMAIN_COLORS, DOMAIN_LABELS, activeDomains (domain extraction)
6. Stats line (reads domainNames.length)
7. Build domain toggle buttons (reads DOMAIN_*)
8. D3 setup, simulation, node/link rendering (linkGroup, nodeGroup_eco)
9. Hull computation (reads domainMembers, nodeById)
10. Interaction handlers (functions — hoisted)
11. SPRINT_PHASES, PHASE_COLORS, PHASE_PLUGINS, PHASE_SKILLS (sprint data — uses var)
11b. WORKFLOW_DEPTH, WORKFLOW_TRACE, getPhaseEntities(), getAllWorkflowEntities() (workflow data)
12. Toggle state, sprint layer groups, phase positions, phase filter buttons
13. Arrow markers (SVG defs)
14. toggleLayer(), rebuildGraph(), rebuildSimulation() (toggle logic)
15. Sprint rendering: renderSprintNodes(), drawSprintFlowArrows()
16. Sprint interactions: selectSprintNode(), showSprintDetail()
17. currentViewMode, sequenceGroup, sankeyGroup, stateMachineGroup (workflow view state)
18. changeViewMode(), changeDepth(), updateWorkflowSelectors() (workflow dispatch)
19. Monkey-patch toggleLayer(), rebuildGraph() for view dispatch
20. renderSequenceView(), renderSankeyView(), renderStateMachineView() (view renderers)
21. smDrillDown(), smCloseDrillDown() (state machine interactions)
22. Workflow view integration: patched deselectAll(), onSearch()
```

**Critical:** Moving code blocks out of this order will cause `ReferenceError` and a blank page with no visible error to the user.

**Sprint + workflow code safety:** All sprint and workflow code uses `var` and function declarations (hoisted) rather than `const`/`let`, and lives at the end of the `<script>` block to avoid ordering issues with the ecosystem code above it.

### Workflow View CSS Classes

| Prefix | View | Examples |
|--------|------|---------|
| `.sequence-*` | Swimlane | `.sequence-header`, `.sequence-row-label`, `.sequence-cell`, `.sequence-artifact-arrow` |
| `.sankey-*` | Sankey Flow | `.sankey-band`, `.sankey-flow`, `.sankey-column-header`, `.sankey-entity-label` |
| `.sm-*` | State Machine | `.sm-phase-node`, `.sm-transition`, `.sm-skip-arc`, `.sm-entity-satellite`, `.sm-active` |

## Deployment

**CRITICAL: GitHub Pages deploys from `main` via Actions, NOT from the `gh-pages` branch.** The deploy workflow (`.github/workflows/deploy.yml`) triggers on pushes to `main` and builds `_site/` from `templates/ecosystem.html` + `data/scan.json`. Pushing to `gh-pages` alone does nothing — the live site won't update.

### Deploy steps

```bash
# 1. Generate (updates docs/diagrams/ecosystem.html + data/scan.json)
bash scripts/generate.sh /root/projects/Demarch

# 2. Commit template + scan data to main in the interchart repo
cd interverse/interchart
git add templates/ecosystem.html data/scan.json
git commit -m "chore: regenerate diagram"
git push origin main

# 3. Actions workflow deploys automatically (~30s)
```

The legacy `regenerate-and-deploy.sh` script pushes to `gh-pages` but this does NOT trigger the Pages deploy. Use the steps above instead.

### Agent-driven (primary)

Agents regenerate the diagram as a final step after any change that adds, removes, or renames plugins, skills, agents, MCP servers, or hooks. This is documented in the Interverse root `AGENTS.md` under "Ecosystem Diagram (interchart)". After generating, **commit and push to `main`** in the interchart repo to trigger deployment.

### GitHub Pages

- Deploy method: GitHub Actions workflow on push to `main`
- Workflow: `.github/workflows/deploy.yml` → builds `_site/` → `actions/deploy-pages`
- URL: https://mistakeknot.github.io/interchart/
- The `gh-pages` branch exists but is NOT used for deployment (legacy)

## Adding New Components

### New plugin appears

The scanner auto-discovers plugins in `plugins/*/`. Just add the plugin with a `.claude-plugin/plugin.json` manifest and regenerate. Skills, agents, MCP servers, and hooks are all discovered from the manifest and `hooks/hooks.json`.

### New node type

1. Add scan logic in `scan.js` (create nodes with `addNode()`)
2. Add color to `TYPE_COLORS` in `templates/ecosystem.html`
3. Add size to `TYPE_SIZES`
4. Add label to `TYPE_LABELS`

### New edge type

1. Add creation logic in `scan.js` (create edges with `addEdge()`)
2. Add CSS class `.link.<type>` in the template `<style>` block

### New overlap domain

Add a rule to `OVERLAP_DOMAIN_RULES` in `scan.js`:
```js
{ domain: 'my-domain', weight: 1.0, patterns: [/\bkeyword\b/i] }
```

Or add a forced group to `FORCED_OVERLAP_GROUPS`:
```js
{ domain: 'my-stack', boost: 1.0, ids: ['plugin-a', 'plugin-b', 'plugin-c'] }
```

## Testing

No test framework — verify manually:

```bash
# Scanner produces valid JSON with expected counts
node scripts/scan.js /root/projects/Demarch 2>/dev/null | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const j=JSON.parse(d);
    console.log('Nodes:', j.stats.nodes, 'Edges:', j.stats.edges, 'Overlaps:', j.stats.overlaps);
    console.log('Types:', Object.keys(j.stats.byType).join(', '));
  })"

# Generate HTML and check file exists
bash scripts/generate.sh /root/projects/Demarch /tmp/test-ecosystem.html
ls -la /tmp/test-ecosystem.html

# Verify variable ordering (no use-before-define)
node scripts/scan.js /root/projects/Demarch 2>/dev/null | \
  bash scripts/generate.sh /root/projects/Demarch /tmp/test.html && \
  echo "Generation succeeded"
```

## Gotchas

- **Blank page = JS error**: The template runs as a single inline `<script>` block. Any `ReferenceError` kills the entire script silently — the page renders as blank with no console visible to most users. Always verify variable ordering after edits.
- **Pushing to `gh-pages` does NOT deploy**: GitHub Pages is configured with `build_type: workflow`. Only pushes to `main` trigger the deploy Actions workflow. The `regenerate-and-deploy.sh` script pushes to `gh-pages` which is a no-op for deployment — you must commit and push to `main` instead.
- **Scanner skips itself**: `interchart` is excluded from scanning (line 339 in `scan.js`) to avoid a self-referential node.
- **D3 CDN dependency**: The generated HTML loads `https://d3js.org/d3.v7.min.js` — it will not render offline.
- **`box-sizing: border-box`**: The template uses this globally. The sidebar overlays the graph (no `padding-left`) so the SVG content area is the full `100vw`.
- **Convex hull edge case**: `d3.polygonHull()` requires 3+ non-collinear points. Two-point domains use a custom rounded-rectangle path. Single-point domains are skipped.
- **gh-pages branch is legacy**: The `gh-pages` branch exists but is not used by the current deployment pipeline. The Actions workflow builds from `main` directly.
