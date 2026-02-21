# interchart

Interactive ecosystem diagram generator. Scans Interverse monorepo and generates a D3.js force graph.

## Quick Commands

```bash
# Generate diagram
bash scripts/generate.sh /root/projects/Interverse

# Run scanner only (JSON to stdout)
node scripts/scan.js /root/projects/Interverse

# Test locally
claude --plugin-dir /root/projects/Interverse/plugins/interchart

# Validate structure
ls skills/*/SKILL.md | wc -l          # Should be 1
python3 -c "import json; json.load(open('.claude-plugin/plugin.json'))"
```

## Design Decisions (Do Not Re-Ask)

- Static scanning only — no MCP servers, no runtime dependencies
- D3.js v7 force graph — self-contained HTML with CDN link
- Node.js scanner — reads plugin.json, skills, hooks across monorepo
- Output: single HTML file at `docs/diagrams/ecosystem.html`
