# interchart

Interactive ecosystem diagram for the Sylveste / Interverse ecosystem. Visualizes plugins, services, skills, agents, hooks, and their relationships as an explorable force-directed graph with an optional sprint workflow overlay.

**Live:** https://generalsystemsventures.com/interchart/

## Features

- **Ecosystem layer**: force-directed graph of 120+ nodes across 11 domains with concentric radial layout (core → plugin ring → leaf ring)
- **Sprint layer**: 10-phase workflow ring (Brainstorm → Ship) with flow arrows, gate diamonds, and skip arcs
- **Combined view**: both layers active by default; sprint ring frames the ecosystem
- **Progressive disclosure**: leaf node labels hidden by default, revealed on hover
- **Phase arc highlights**: click a plugin to see colored arcs on the sprint ring showing which phases it participates in
- **Draggable nodes**: drag any node (ecosystem or sprint phase) to rearrange; sprint phases stay pinned where dropped
- **Domain hulls**: convex hull overlays group nodes by domain; dimmed when sprint is active
- **Detail panel**: click any node for description, children, connections, and sprint phase participation
- **Hooks toggle**: show/hide hook event edges (hidden by default to reduce noise)
- **Filters**: filter by node type, domain, sprint phase; search by name

## Usage

```bash
# Generate diagram from local monorepo
bash scripts/generate.sh

# Generate to a specific output path
bash scripts/generate.sh "$(cd ../.. && pwd)" /tmp/test.html

# Publish to generalsystemsventures.com/interchart/
bash scripts/regenerate-and-deploy.sh

# If your gsvdotcom checkout is not at ~/projects/gsvdotcom
bash scripts/regenerate-and-deploy.sh "$(cd ../.. && pwd)" /path/to/gsvdotcom
```

## Regeneration model (ratified 2026-07-14: on-demand)

There is deliberately **no regeneration cron/timer**. The hosted embed updates
only when someone runs `regenerate-and-deploy.sh` (locked, worktree-isolated —
safe to run any time). Ratified over a zklw systemd timer because publishing to
generalsystemsventures.com stays behind an explicit operator go/no-go, and scan
data churns constantly across the monorepo — a timer would deploy continuously
for marginal visitor value. If the embed looks stale next to a real ecosystem
change, run the script; freshness debt is visible in the embed's own
"generated" stamp. (An earlier 5-minute server-side cron existed and was
retired; the mobile-template revert risk that made staleness dangerous was
fixed at the template source, verified 2026-07-14.)

## How it works

1. **Scanner** (`scripts/scan.js`) walks the monorepo reading `plugin.json`, `SKILL.md`, `hooks.json`, and Go source files. Outputs a JSON graph of nodes and edges.
2. **Template** (`templates/ecosystem.html`) is a self-contained HTML file with inline D3.js v7 (loaded from CDN). The scanner output is injected as a `DATA_PLACEHOLDER`.
3. **Publish** writes the generated graph into `gsvdotcom/public/interchart/embed/index.html`; generalsystemsventures.com serves it inside a first-party `/interchart/` page instead of sending users to a visually separate standalone page.

## Architecture

```
scripts/
  scan.js                 → Node.js scanner (reads monorepo structure)
  generate.sh             → Scanner + template assembly
  regenerate-and-deploy.sh → Generate + publish into gsvdotcom /interchart/
templates/
  ecosystem.html          → D3.js template (CSS + JS + HTML in one file)
data/
  scan.json               → Cached scanner output
```
