---
name: interchart
description: Generate interactive ecosystem diagram showing the Sylveste / Interverse plugin ecosystem, including skills, agents, MCP servers, and their relationships as a D3.js force graph.
---

# Interchart: Ecosystem Diagram Generator

Generate an interactive HTML diagram of the Sylveste / Interverse ecosystem.

## Steps

1. Determine the Sylveste monorepo root — the directory that contains **both**
   `interverse/` and `os/` (normally `~/projects/Sylveste`).

   **Do not pass `${CLAUDE_PLUGIN_ROOT}` as the root.** It points at the plugin
   cache, not the monorepo. Passing a plugin directory instead of the monorepo
   root is the one mistake that has broken this generator three times: the scan
   then sees only that one plugin (**6 nodes instead of ~249**) *and* the output
   is redirected into that plugin's own `docs/`, because the output path is
   derived from the root. The result looks like a normal regeneration.

   Verify before running: `ls <sylveste_root>` must show `interverse` and `os`.

2. Run the generator script:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/generate.sh "<sylveste_root>" "<output_path>"
   ```
   - Default output: `docs/diagrams/ecosystem.html` **in the Sylveste root**
   - The script scans all plugin manifests, skills, agents, MCP servers, and hooks
   - It re-writes the output only when the content actually changed, so repeat
     runs do not dirty the repo

3. Read the exit code before reporting anything.
   - **`2`** — the root is not the monorepo. Fix the path; do not retry with a
     different output path.
   - **`3`** — the scan collapsed against the existing artefact and nothing was
     written. Do not override the guard to make it pass; find out why the scan
     came back small. A root-repo git worktree materialises almost none of the
     nested repos and produces exactly this.
   - **`0`** — report the node/edge counts and the output path. A healthy scan
     of the full monorepo is in the low hundreds of nodes; anything under ~100
     means you scanned a subtree, even though the run succeeded.

4. Report to the user:
   - Number of nodes and edges found
   - Output file path
   - Suggest: "Open the file in a browser to explore the interactive diagram"

## Options

- `/interchart` or `/interchart generate` — generate with defaults
- `/interchart <path>` — specify a custom output path
