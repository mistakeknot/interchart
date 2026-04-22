# Visualization (ecosystem.html)

## Toggle Architecture

The app uses a **unified force graph** with two independent toggle buttons in the toolbar, plus **workflow view selectors** (visible when Sprint is ON):

| Toggle | Content | Default |
|--------|---------|---------|
| **Ecosystem** | D3.js force-directed graph of the Sylveste / Interverse ecosystem | ON |
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

## UI Layout

- **Toolbar** (top, 44px): "Sylveste" title, toggle bar (Ecosystem/Sprint), view-mode select, depth select, stats, search box
- **Sidebar toggle** (fixed position, top-left): Hamburger button to expand filter sidebar
- **Filter sidebar** (left, 240px, overlay): Type filters + domain hull toggles + sprint phase toggles (when sprint active). Starts collapsed.
- **Graph area** (center): Single D3.js force-directed SVG (full viewport)
- **Detail panel** (right, slides in): Shows node metadata for both ecosystem and sprint nodes

## Sprint Nodes in Force Graph

Sprint phase nodes are rendered as **rounded rectangles** (160x56px) in a separate SVG layer on top of the force graph. They are **pinned** (fixed `fx`/`fy`) in a horizontal arc:

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

## Interactions

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

## Template Variable Ordering

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

## Workflow View CSS Classes

| Prefix | View | Examples |
|--------|------|---------|
| `.sequence-*` | Swimlane | `.sequence-header`, `.sequence-row-label`, `.sequence-cell`, `.sequence-artifact-arrow` |
| `.sankey-*` | Sankey Flow | `.sankey-band`, `.sankey-flow`, `.sankey-column-header`, `.sankey-entity-label` |
| `.sm-*` | State Machine | `.sm-phase-node`, `.sm-transition`, `.sm-skip-arc`, `.sm-entity-satellite`, `.sm-active` |
