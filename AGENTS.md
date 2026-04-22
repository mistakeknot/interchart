# interchart — AGENTS.md

Interactive ecosystem diagram generator for the Sylveste / Interverse ecosystem. Scans all plugins, skills, agents, MCP servers, hooks, and infrastructure nodes and produces a self-contained D3.js force graph.

**Live diagram:** https://generalsystemsventures.com/interchart/

## Canonical References
1. [`PHILOSOPHY.md`](../../PHILOSOPHY.md) — direction for ideation and planning decisions.
2. `CLAUDE.md` — implementation details, architecture, testing, and release workflow.

## Quick Reference

```bash
# Generate diagram locally
bash scripts/generate.sh

# Scanner only (JSON to stdout)
node scripts/scan.js "$(cd ../.. && pwd)"

# Publish to generalsystemsventures.com/interchart/
bash scripts/regenerate-and-deploy.sh

# If gsvdotcom is checked out somewhere else
bash scripts/regenerate-and-deploy.sh "$(cd ../.. && pwd)" /path/to/gsvdotcom
```

**Location:** `interverse/interchart/`
**Scanner:** `scripts/scan.js` (Node.js, ~529 lines)
**Template:** `templates/ecosystem.html` (D3.js v7, ~2977 lines)
**Deploy:** pushes regenerated HTML into gsvdotcom `public/interchart/index.html` on `main`

## Topic Guides

| Topic | File | Covers |
|-------|------|--------|
| Architecture | [agents/architecture.md](agents/architecture.md) | Pipeline, file layout, data injection |
| Data Model | [agents/data-model.md](agents/data-model.md) | Node types, edge types, overlap/domain system |
| Visualization | [agents/visualization.md](agents/visualization.md) | Toggle architecture, UI layout, sprint nodes, interactions, variable ordering, CSS classes |
| Deployment | [agents/deployment.md](agents/deployment.md) | Deploy steps, agent-driven workflow, gsvdotcom publishing |
| Extending | [agents/extending.md](agents/extending.md) | Adding plugins, node types, edge types, overlap domains |
| Testing | [agents/testing.md](agents/testing.md) | Manual verification commands |
| Gotchas | [agents/gotchas.md](agents/gotchas.md) | Blank page debugging, deploy pitfalls, CDN dependency, hull edge cases |

