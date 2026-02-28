# interchart Philosophy

## Purpose
Interactive ecosystem diagram — scans Interverse monorepo and generates a D3.js force graph showing all plugins, skills, MCP tools, hooks, and their relationships.

## North Star
Make the ecosystem legible at a glance.

## Working Priorities
- Graph accuracy (every real relationship, no phantom edges)
- Visual clarity (useful without explanation)
- Scan freshness (reflects current state)

## Brainstorming Doctrine
1. Start from outcomes and failure modes, not implementation details.
2. Generate at least three options: conservative, balanced, and aggressive.
3. Explicitly call out assumptions, unknowns, and dependency risk across modules.
4. Prefer ideas that improve clarity, reversibility, and operational visibility.

## Planning Doctrine
1. Convert selected direction into small, testable, reversible slices.
2. Define acceptance criteria, verification steps, and rollback path for each slice.
3. Sequence dependencies explicitly and keep integration contracts narrow.
4. Reserve optimization work until correctness and reliability are proven.

## Decision Filters
- Does this help someone understand the ecosystem faster?
- Does this surface relationships that aren't obvious from code?
- Is the visualization actionable (can you click through to the code)?
- Does this stay current without manual intervention?
