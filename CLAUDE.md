# interchart

Interactive ecosystem diagram generator for the Sylveste / Interverse ecosystem. See `AGENTS.md` for architecture, data model, and troubleshooting.

## Quick Commands

```bash
# Generate diagram
bash scripts/generate.sh

# Scanner only (JSON to stdout)
node scripts/scan.js "$(cd ../.. && pwd)"

# Publish to generalsystemsventures.com/interchart/
bash scripts/regenerate-and-deploy.sh
```

## Design Decisions (Do Not Re-Ask)

- Static scanning only — no MCP servers, no runtime dependencies
- D3.js v7 force graph — self-contained HTML, CDN-loaded D3
- Node.js scanner — reads plugin.json, SKILL.md, hooks.json across monorepo
- `generate.sh` default output: local snapshot at `docs/diagrams/ecosystem.html`; canonical hosted copy is the gsvdotcom embed published by `regenerate-and-deploy.sh`
- Overlaps shown as convex hull domain overlays, not edges
- Server-side cron (every 5 min) — no GitHub Actions for regeneration
- Template variables must be defined before use (no hoisting for `const`/`let`)
- Workflow views (Swimlane/Sankey/State Machine) use static SVG layout, not force simulation
- Workflow depth data (`WORKFLOW_TRACE`) is curated in template, not scanned
- Monkey-patching `rebuildGraph()`/`toggleLayer()` avoids rewriting existing sprint code
- No d3-sankey CDN — manual sankey layout with cubic bezier paths
- All workflow code uses `var`/`function` (hoisted), appended after sprint block
