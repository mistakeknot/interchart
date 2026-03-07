# Deployment

**CRITICAL: GitHub Pages deploys from `main` via Actions, NOT from the `gh-pages` branch.** The deploy workflow (`.github/workflows/deploy.yml`) triggers on pushes to `main` and builds `_site/` from `templates/ecosystem.html` + `data/scan.json`. Pushing to `gh-pages` alone does nothing — the live site won't update.

## Deploy Steps

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

## Agent-Driven (Primary)

Agents regenerate the diagram as a final step after any change that adds, removes, or renames plugins, skills, agents, MCP servers, or hooks. This is documented in the Interverse root `AGENTS.md` under "Ecosystem Diagram (interchart)". After generating, **commit and push to `main`** in the interchart repo to trigger deployment.

## GitHub Pages

- Deploy method: GitHub Actions workflow on push to `main`
- Workflow: `.github/workflows/deploy.yml` → builds `_site/` → `actions/deploy-pages`
- URL: https://mistakeknot.github.io/interchart/
- The `gh-pages` branch exists but is NOT used for deployment (legacy)
