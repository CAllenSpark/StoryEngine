# StoryEngine Dashboard

**Last updated:** 2026-04-06 (Sprint 1.5 — vision refinement + tech director review)
**Active branch:** `claude/sprite-story-engine-Fsslv`

## Milestones

| # | Milestone | Target | Status |
|---|---|---|---|
| M0 | Team + docs foundation | Sprint 1 | Complete |
| M1 | Stack ratified, monorepo scaffold, tilemap + sprite at perf budget | Sprint 2 | Not started |
| M2 | Tile Creator Studio MVP | Sprint 3 | Not started |
| M3 | Game Design Studio MVP | Sprint 4 | Not started |
| M4 | First playable 5-min micro-adventure | Sprint 5 | Not started |
| M5 | Audio + save + content pipeline hardening | Sprint 6 | Not started |
| M6 | Mobile wrapper spike | TBD | Not started |
| M7 | AI Companion prototype (BYOK LLM companion) | TBD | Not started |

## Current Sprint — Sprint 2 (Proposed)

**Goal:** Ratify rendering stack + backend provider, scaffold monorepo, render tilemap + 200 sprites at perf budget on real device. Design deliverables: world state schema, publish API, telemetry v2, Game Design Studio wireframes, condition language, shared asset strategy, $/MAU cost model.

**Previous:** Sprint 1 — Complete. [`docs/sprints/sprint-01.md`](../docs/sprints/sprint-01.md)

## KPIs Snapshot

See [`docs/kpis.md`](../docs/kpis.md). No runtime data yet (pre-implementation).

| KPI | Target (draft) | Current |
|---|---|---|
| Avg micro-adventure length | 4–6 min | n/a |
| Completed adventures / user / week (north star) | ≥3 | n/a |
| p95 frame time (desktop) | ≤16.6 ms | n/a |
| p95 frame time (low-end mobile) | ≤33.3 ms | n/a |
| Cold start | <3 s | n/a |
| Crash-free sessions | ≥99.5% | n/a |
| $/MAU | TBD Sprint 2 | n/a |

## Top Risks

See [`docs/risks.md`](../docs/risks.md). Top risks (18 total):
1. **(R1, High)** Rendering perf on low-end mobile.
2. **(R2, High)** 5-minute constraint vs. narrative depth.
3. **(R9, High)** WYSIWYG studio complexity doubles surface area.
4. **(R13, High)** Game Design Studio UX — if clunky, creators abandon it.
5. **(R17, High)** Legal/compliance (GDPR, COPPA, ToS) needed before public launch.

## Doc Freshness

| Doc | Last Updated | Owner |
|---|---|---|
| [PRD](../docs/prd.md) | 2026-04-06 | PM |
| [FRD](../docs/frd.md) | 2026-04-06 | UI/UX |
| [GDD](../docs/gdd.md) | 2026-04-06 | Design Leader |
| [TDD](../docs/tdd.md) | 2026-04-06 | Frontend + Backend |
| [Brand Bible](../docs/brand-bible.md) | 2026-04-05 | Design Leader |
| [KPIs](../docs/kpis.md) | 2026-04-06 | PM |
| [Risks](../docs/risks.md) | 2026-04-06 | PM |

## Sprint Log

| Sprint | Dates | Goal | Outcome |
|---|---|---|---|
| 01 | 2026-04-05 | Team + docs foundation | Complete — 28 files seeded, 10 agents persistent |
| 1.5 | 2026-04-06 | Vision refinement + tech director review | Complete — HyperCard model, 6 tech areas, world state, publishing, monetization, AI companion roadmap, 18 risks |
