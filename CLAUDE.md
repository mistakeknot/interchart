# interchart

Interactive ecosystem diagram generator for the Demarch monorepo. See `AGENTS.md` for architecture, data model, and troubleshooting.

## Quick Commands

```bash
# Generate diagram
bash scripts/generate.sh /root/projects/Demarch

# Scanner only (JSON to stdout)
node scripts/scan.js /root/projects/Demarch

# Deploy to GitHub Pages
bash scripts/regenerate-and-deploy.sh /root/projects/Demarch
```

## Design Decisions (Do Not Re-Ask)

- Static scanning only — no MCP servers, no runtime dependencies
- D3.js v7 force graph — self-contained HTML, CDN-loaded D3
- Node.js scanner — reads plugin.json, SKILL.md, hooks.json across monorepo
- Output: single HTML file at `docs/diagrams/ecosystem.html`
- Overlaps shown as convex hull domain overlays, not edges
- Server-side cron (every 5 min) — no GitHub Actions for regeneration
- Template variables must be defined before use (no hoisting for `const`/`let`)
