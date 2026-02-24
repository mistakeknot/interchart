# Research: Subprojects Missing CLAUDE.md or AGENTS.md

**Date:** 2026-02-20
**Scope:** All directories with `.git` under `/root/projects/Interverse`

## Summary

- **42 subprojects** found with their own `.git` directory
- **4 repos** are missing `CLAUDE.md`
- **0 repos** are missing `AGENTS.md`
- **Interforge/** exists but is not a git repo (no `.git`); it has no CLAUDE.md or AGENTS.md

## Full Table

Sorted with missing docs first, then alphabetically.

| Path | has_claude_md | has_agents_md |
|------|:---:|:---:|
| infra/interband | **NO** | yes |
| plugins/interpub | **NO** | yes |
| plugins/intersearch | **NO** | yes |
| sdk/interbase | **NO** | yes |
| (root) | yes | yes |
| hub/autarch | yes | yes |
| os/clavain | yes | yes |
| infra/agent-rig | yes | yes |
| infra/interbench | yes | yes |
| infra/intercore | yes | yes |
| infra/marketplace | yes | yes |
| plugins/interchart | yes | yes |
| plugins/intercheck | yes | yes |
| plugins/intercraft | yes | yes |
| plugins/interdev | yes | yes |
| plugins/interdoc | yes | yes |
| plugins/interfluence | yes | yes |
| plugins/interflux | yes | yes |
| plugins/interform | yes | yes |
| plugins/interject | yes | yes |
| plugins/interkasten | yes | yes |
| plugins/interleave | yes | yes |
| plugins/interlens | yes | yes |
| plugins/interline | yes | yes |
| plugins/interlock | yes | yes |
| plugins/intermap | yes | yes |
| plugins/intermem | yes | yes |
| plugins/intermux | yes | yes |
| plugins/internext | yes | yes |
| plugins/interpath | yes | yes |
| plugins/interpeer | yes | yes |
| plugins/interphase | yes | yes |
| plugins/interserve | yes | yes |
| plugins/interslack | yes | yes |
| plugins/interstat | yes | yes |
| plugins/intersynth | yes | yes |
| plugins/intertest | yes | yes |
| plugins/interwatch | yes | yes |
| plugins/tldr-swinton | yes | yes |
| plugins/tool-time | yes | yes |
| plugins/tuivision | yes | yes |
| services/intermute | yes | yes |

## Non-Git Directories

| Path | has_claude_md | has_agents_md | Notes |
|------|:---:|:---:|-------|
| Interforge/ | no | no | Not a git repo; contains only `docs/` subdirectory |

## Repos Missing CLAUDE.md (4)

1. **infra/interband** — has AGENTS.md but no CLAUDE.md
2. **plugins/interpub** — has AGENTS.md but no CLAUDE.md
3. **plugins/intersearch** — has AGENTS.md but no CLAUDE.md
4. **sdk/interbase** — has AGENTS.md but no CLAUDE.md

## Repos Missing AGENTS.md (0)

All 42 repos have AGENTS.md.

## Observations

- Documentation coverage is very high: 38 of 42 repos (90.5%) have both files.
- Every repo has an AGENTS.md — the gap is only on the CLAUDE.md side.
- The 4 missing CLAUDE.md files are spread across infra (1), plugins (2), and sdk (1).
- Interforge is a new untracked directory (shown in `git status`) that is not yet a git repo and has no documentation files.
