---
name: interchart
description: Generate interactive ecosystem diagram showing the Sylveste / Interverse plugin ecosystem, including skills, agents, MCP servers, and their relationships as a D3.js force graph.
---

# Interchart: Ecosystem Diagram Generator

Generate an interactive HTML diagram of the Sylveste / Interverse ecosystem.

## Steps

1. Determine the Sylveste monorepo root directory. Default: the monorepo root (parent of `interverse/`, `os/`, `core/`). If you're unsure, look for the directory containing `interverse/` and `os/Clavain/`.

2. Run the generator script:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/generate.sh "<sylveste_root>" "<output_path>"
   ```
   - Default output: `docs/diagrams/ecosystem.html` in the Sylveste root
   - The script scans all plugin manifests, skills, agents, MCP servers, and hooks

3. Report the result to the user:
   - Number of nodes and edges found
   - Output file path
   - Suggest: "Open the file in a browser to explore the interactive diagram"

## Options

- `/interchart` or `/interchart generate` — generate with defaults
- `/interchart <path>` — specify a custom output path
