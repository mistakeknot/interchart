# Scanner Data Model (scan.js)

## Node Types

| Type | Description | Size | Example |
|------|-------------|------|---------|
| `monorepo` | Sylveste root | 24 | Sylveste |
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

## Edge Types

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

## Overlap / Domain System

Overlap edges are **not drawn as edges** — they're visualized as **convex hull domain overlays**. Each domain is a colored translucent polygon enclosing all plugins that share that capability area.

**How overlaps are computed** (in `computeOverlapEdges()`):

1. Each plugin/hub/kernel/service node gets its description text matched against `OVERLAP_DOMAIN_RULES` (regex patterns → domain names with weights)
2. `FORCED_OVERLAP_GROUPS` add curated groupings (e.g., analytics stack, doc lifecycle)
3. Two nodes overlap if they share 2+ domains OR score >= 2.4 OR belong to a forced group

**Current domains** (11): analytics-observability, analytics-quality-stack, coordination-dispatch, design-product, discovery-context-stack, discovery-research, doc-lifecycle-stack, docs-artifacts, phase-gate-control, phase-gates, quality-review

To add a domain: add a rule to `OVERLAP_DOMAIN_RULES` in `scan.js` or a group to `FORCED_OVERLAP_GROUPS`.
