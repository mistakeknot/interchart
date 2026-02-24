# interchart

Interactive ecosystem diagram for the Interverse monorepo. Visualizes plugins, services, skills, agents, hooks, and their relationships as an explorable force-directed graph with an optional sprint workflow overlay.

**Live:** https://mistakeknot.github.io/interchart/

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
bash scripts/generate.sh /root/projects/Interverse

# Generate to a specific output path
bash scripts/generate.sh /root/projects/Interverse /tmp/test.html

# Deploy to GitHub Pages
bash scripts/regenerate-and-deploy.sh /root/projects/Interverse
```

## How it works

1. **Scanner** (`scripts/scan.js`) walks the monorepo reading `plugin.json`, `SKILL.md`, `hooks.json`, and Go source files. Outputs a JSON graph of nodes and edges.
2. **Template** (`templates/ecosystem.html`) is a self-contained HTML file with inline D3.js v7 (loaded from CDN). The scanner output is injected as a `DATA_PLACEHOLDER`.
3. **Deploy** pushes the generated `index.html` to the `gh-pages` branch using a git worktree.

## Architecture

```
scripts/
  scan.js                 → Node.js scanner (reads monorepo structure)
  generate.sh             → Scanner + template assembly
  regenerate-and-deploy.sh → Generate + deploy to gh-pages
templates/
  ecosystem.html          → D3.js template (CSS + JS + HTML in one file)
data/
  scan.json               → Cached scanner output
```
