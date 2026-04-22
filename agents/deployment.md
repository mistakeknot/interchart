# Deployment

**CRITICAL: interchart now publishes through `gsvdotcom` at `public/interchart/embed/index.html`, served inside `https://generalsystemsventures.com/interchart/`.** GitHub Pages is no longer the canonical live host.

## Deploy Steps

```bash
# 1. Regenerate and publish to gsvdotcom
bash scripts/regenerate-and-deploy.sh

# 2. The script commits and pushes gsvdotcom/main via a temporary worktree
#    so the live site updates from generalsystemsventures.com/interchart/

# If gsvdotcom lives elsewhere
bash scripts/regenerate-and-deploy.sh "$(cd ../.. && pwd)" /path/to/gsvdotcom
```

## Agent-Driven (Primary)

Agents regenerate the diagram as a final step after any change that adds, removes, or renames plugins, skills, agents, MCP servers, or hooks. After regenerating, publish it into `gsvdotcom/public/interchart/embed/index.html` so the canonical live copy stays embedded inside generalsystemsventures.com.

## Live Host

- Canonical URL: https://generalsystemsventures.com/interchart/
- Publish method: temporary worktree commit/push into `gsvdotcom` `main`
- `regenerate-and-deploy.sh` refreshes `data/scan.json` before publishing so the checked-in scan cache stays aligned with the hosted copy; `docs/diagrams/ecosystem.html` is no longer treated as the canonical live artifact
- `gh-pages` is legacy and should not be treated as canonical
