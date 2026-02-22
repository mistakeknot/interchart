# interchart Vision Document

**Version:** 0.1.0
**Last updated:** 2026-02-22

## The Core Idea

interchart gives the Interverse ecosystem an always-current, explorable systems map. It turns scattered manifests, skills, hooks, and infrastructure relationships into one visual surface that makes dependencies, clusters, and structural drift obvious.

## Why This Exists

As the ecosystem grows, textual inventories stop being enough for coordination. Contributors need a fast way to answer:

- what changed structurally,
- what depends on what,
- where overlap and coupling are increasing,
- and where roadmap work should focus next.

interchart is the operational visibility layer for those questions.

## Current State

interchart already provides:

- monorepo scanning for plugins, skills, agents, hooks, services, and kernel/hub nodes,
- force-directed ecosystem visualization with domain overlays,
- sprint overlay with phase relationships,
- and deterministic generation plus gh-pages deployment.

## Direction

- Keep generation deterministic and fast for routine regeneration.
- Improve semantic grouping quality (domains and overlap confidence).
- Strengthen change-awareness so topology shifts are easier to review after merges.
- Preserve low-friction publishing so the diagram stays current by default.

## Design Principles

- Generated output must be reproducible from source state.
- Visual clarity beats exhaustive ornamentation.
- Ecosystem and sprint layers should remain composable and understandable together.
- Operational workflows (generate, review, deploy) should remain scriptable end-to-end.
