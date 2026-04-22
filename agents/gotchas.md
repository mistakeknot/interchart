# Gotchas

- **Blank page = JS error**: The template runs as a single inline `<script>` block. Any `ReferenceError` kills the entire script silently — the page renders as blank with no console visible to most users. Always verify variable ordering after edits.
- **Canonical host is now gsvdotcom**: `https://generalsystemsventures.com/interchart/` is the live URL. If you see docs or old habits referring to GitHub Pages as canonical, update them before following those instructions.
- **Publishing needs both repos**: `scripts/regenerate-and-deploy.sh` now expects both the Sylveste checkout and a writable `gsvdotcom` checkout (default `~/projects/gsvdotcom`). If `gsvdotcom` lives elsewhere, pass it explicitly as the second argument.
- **Publish refreshes the scan cache, not the old local snapshot**: `scripts/regenerate-and-deploy.sh` now routes through `scripts/generate.sh`, so `data/scan.json` stays aligned with the hosted HTML. `docs/diagrams/ecosystem.html` is no longer the canonical live artifact.
- **Scanner skips itself**: `interchart` is excluded from scanning (line 339 in `scan.js`) to avoid a self-referential node.
- **D3 CDN dependency**: The generated HTML loads `https://d3js.org/d3.v7.min.js` — it will not render offline.
- **`box-sizing: border-box`**: The template uses this globally. The sidebar overlays the graph (no `padding-left`) so the SVG content area is the full `100vw`.
- **Convex hull edge case**: `d3.polygonHull()` requires 3+ non-collinear points. Two-point domains use a custom rounded-rectangle path. Single-point domains are skipped.
- **Legacy gh-pages instructions are stale**: if you push to `gh-pages`, nothing user-visible should depend on it anymore. The hosted graph is the file published into `gsvdotcom/public/interchart/embed/index.html`, wrapped by the site-level `/interchart/` page.
