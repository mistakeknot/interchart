# interchart Roadmap

**Version:** 0.1.0
**Last updated:** 2026-02-22

## Where We Are

interchart scans the monorepo and generates a self-contained D3 diagram with ecosystem and sprint overlays. Deployment is automated through the regeneration script and gh-pages publishing flow.

## Roadmap — Now

- [interchart-now-doc-baseline] **Establish canonical product artifacts** so roadmap and vision are tracked in-module.
- [interchart-now-scan-stability] **Harden scan script behavior** for edge-case manifests and missing metadata.
- [interchart-now-layout-quality] **Improve default layout stability** so repeated generations are easier to diff visually.

## Roadmap — Next

- [interchart-next-diff-view] **Add topology change summaries** between scans for quick review in CI and local workflows.
- [interchart-next-domain-tuning] **Refine overlap domain rules** to reduce false-positive cluster associations.
- [interchart-next-ux-polish] **Improve filtering and detail panel ergonomics** for dense graph sessions.

## Roadmap — Later

- [interchart-later-history] **Introduce historical snapshots** for ecosystem evolution over time.
- [interchart-later-risk-signals] **Surface structural risk signals** (critical hubs, high coupling, fragile bridges).
- [interchart-later-automation] **Integrate with roadmap workflows** so doc and graph drift are reported together.

## Research Agenda

- Evaluate graph readability metrics for large-node scenarios.
- Determine the right thresholding strategy for overlap domains.
- Explore compact diff artifacts suitable for PR review.

## Keeping Current

Regenerate with `/interpath:roadmap` and update this file alongside `docs/interchart-vision.md` when topology or operating model changes.
