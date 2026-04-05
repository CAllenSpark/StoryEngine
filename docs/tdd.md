# Technical Design Document — StoryEngine

> Sprint 1 seed. Co-owners: Frontend Engineer (frontend), Backend Engineer (backend). Accountable: PM.

## System Overview

```
┌───────────────────┐   ┌───────────────────┐   ┌──────────────────┐
│  Tile Creator     │   │  Game Design      │   │  Player Shell    │
│  Studio (web)     │   │  Studio (web)     │   │  (web/mobile)    │
└────────┬──────────┘   └─────────┬─────────┘   └────────┬─────────┘
         │ scene.json             │ adventure.json       │ bundle
         ▼                        ▼                      ▼
              ┌───────────────────────────────┐
              │   Engine Runtime (browser)    │
              │   render · audio · input      │
              └─────────────┬─────────────────┘
                            │
              ┌─────────────▼─────────────────┐
              │   Backend (CDN + serverless)  │
              │   content · save · telemetry  │
              └───────────────────────────────┘
```

## Frontend *(Frontend Engineer)*

**Candidate rendering stacks (Sprint 1 research → Sprint 2 decision):**
- PixiJS (WebGL + Canvas fallback) — mature sprite batching.
- Phaser — opinionated game framework.
- Custom Canvas2D — smallest bundle, simplest mental model.
- WebGPU direct — future-facing but mobile support uneven.

**Non-negotiables:**
- Components under 200 lines. Split at natural concern boundaries. Extract stateful logic into custom hooks. Never split purely for line count.
- Object pooling, texture atlases, render-on-change.
- No library without a bundle-size + mobile check.

**Data formats (draft):**
- `scene.json` — tilemap layers, tileset refs, metadata.
- `adventure.json` — actors, beats, dialogue graph, triggers, asset refs.
- Versioned; migrations owned by frontend + tester.

## Backend *(Backend Engineer)*

**Default posture:** serverless + static CDN until data proves otherwise.

**Candidate services (Sprint 2 decision):** Cloudflare Pages/Workers + R2, or Vercel + edge functions + S3.

**Concerns owned:**
- Content delivery (adventure bundles).
- Save/sync (start offline-first; sync optional).
- Telemetry — minimal, privacy-respecting, KPI-driven.
- Auth — deferred until sync is introduced.
- `$/MAU` cost model lives in [`wiki/performance-budget.md`](wiki/performance-budget.md).

## Mobile Wrapper (Sprint N)

Candidates: Capacitor, PWA-only, Tauri Mobile. Decision deferred until browser MVP is green against perf budget.

## Asset Pipeline (draft)

- Tiles/sprites → packed atlases at build time.
- Audio → per-platform bitrates with fallbacks.
- Adventures bundled as a single archive with a manifest + hash.

## Testing & Performance Gates *(Tester)*

See [`wiki/performance-budget.md`](wiki/performance-budget.md). From Sprint 2, every PR runs a perf regression gate.

## Open Questions
Tracked in [`sprints/sprint-01.md`](sprints/sprint-01.md) research section, carried forward each sprint.
