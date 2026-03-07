# Gotchas

- **Blank page = JS error**: The template runs as a single inline `<script>` block. Any `ReferenceError` kills the entire script silently — the page renders as blank with no console visible to most users. Always verify variable ordering after edits.
- **Pushing to `gh-pages` does NOT deploy**: GitHub Pages is configured with `build_type: workflow`. Only pushes to `main` trigger the deploy Actions workflow. The `regenerate-and-deploy.sh` script pushes to `gh-pages` which is a no-op for deployment — you must commit and push to `main` instead.
- **Scanner skips itself**: `interchart` is excluded from scanning (line 339 in `scan.js`) to avoid a self-referential node.
- **D3 CDN dependency**: The generated HTML loads `https://d3js.org/d3.v7.min.js` — it will not render offline.
- **`box-sizing: border-box`**: The template uses this globally. The sidebar overlays the graph (no `padding-left`) so the SVG content area is the full `100vw`.
- **Convex hull edge case**: `d3.polygonHull()` requires 3+ non-collinear points. Two-point domains use a custom rounded-rectangle path. Single-point domains are skipped.
- **gh-pages branch is legacy**: The `gh-pages` branch exists but is not used by the current deployment pipeline. The Actions workflow builds from `main` directly.
