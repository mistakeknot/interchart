# Architecture

## Pipeline

```
scripts/scan.js          → Scans monorepo, outputs JSON graph (nodes + edges)
scripts/generate.sh      → Runs scanner → injects JSON into HTML template → writes output
templates/ecosystem.html → D3.js force graph template with /*DATA_PLACEHOLDER*/ marker
scripts/regenerate-and-deploy.sh  → Generate + publish to gsvdotcom /interchart/
scripts/watch-and-deploy.sh       → Cron wrapper — fingerprint-based change detection
```

```
scan.js ─→ JSON ─→ generate.sh ─→ ecosystem.html
                        │
              template + data injection
                        │
              (/*DATA_PLACEHOLDER*/ → JSON blob)
```

The generated HTML is fully self-contained — the only external dependency is the D3.js v7 CDN script.

## File Layout

```
.claude-plugin/plugin.json    → Plugin manifest (name, version, skills)
scripts/
  scan.js                     → Node.js scanner (~529 lines)
  generate.sh                 → Generate HTML from template + scanned data
  regenerate-and-deploy.sh    → Full pipeline: generate → compare → publish into gsvdotcom
  watch-and-deploy.sh         → Cron-friendly: SHA fingerprint → regenerate if changed
templates/
  ecosystem.html              → D3.js visualization template (~2977 lines)
skills/interchart/SKILL.md    → Claude Code skill for /interchart command
.last-scan-state              → SHA256 fingerprint of last cron run (gitignored)
```
