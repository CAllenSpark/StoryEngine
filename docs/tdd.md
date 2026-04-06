# Technical Design Document — StoryEngine

> Sprint 1 seed. Co-owners: Frontend Engineer (frontend), Backend Engineer (backend). Accountable: PM.

## System Overview

```
┌─────────────────────────┐   ┌─────────────────────────┐   ┌──────────────────┐
│  Tile Creator Studio    │   │  Game Design Studio     │   │  Player Shell    │
│  (web, WYSIWYG preview) │   │  (web, WYSIWYG preview) │   │  (web/mobile)    │
└──────────┬──────────────┘   └──────────┬──────────────┘   └────────┬─────────┘
           │ scene.json                  │ adventure.json            │
           ▼                             ▼                          │
     ┌─────────────────────────────────────────┐                    │
     │         Code Export / Bundler           │                    │
     │  validate · tree-shake · pack · emit    │                    │
     └──────────────────┬──────────────────────┘                    │
                        │ adventure bundle                          │
                        ▼                                           ▼
              ┌───────────────────────────────────┐
              │   Engine Runtime (browser)        │
              │   render · audio · input · debug  │
              └─────────────┬─────────────────────┘
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
- `adventure.json` — actors, beats, dialogue graph, triggers, asset refs, inventory definitions, card-unlock relationships. Includes a `mediaType` field on all media references for future extensibility.
- Versioned; migrations owned by frontend + tester.

### Performance Monitoring

Built-in diagnostics, toggleable via URL params or dev flags:

- **`?debug=perf`** — FPS counter, frame time (ms), draw call count, memory estimate, sprite count.
- **Browser APIs used:** `performance.now()` for frame timing, `navigator.deviceMemory` for adaptive quality decisions, `PerformanceObserver` for FCP/LCP tracking, `ResizeObserver` for viewport changes and scaling.
- **Targets (detailed in [`wiki/performance-budget.md`](wiki/performance-budget.md)):**
  - 150–300 sprites on-screen (tiles + actors + UI combined)
  - FCP < 1.5–2 s on 3G/mobile
  - Full adventure bundle load < 5 s
  - Peak mobile memory < 150–200 MB
  - Audio decode latency < 100–200 ms
- **CI gates:** `size-limit` for bundle size checks per package, automated Lighthouse audits on every PR (performance > 90, accessibility > 90, PWA pass).
- **Real device mandate:** CI covers desktop Chrome + emulated mobile. Monthly manual pass on physical Android (3-year-old midrange) and iOS Safari. Do not trust desktop Chrome alone.

### Debugging Infrastructure

All debug features are **zero-cost when disabled** — no DOM elements created, no event listeners attached, no allocations in the hot path.

- **Debug mode:** activated via URL flag (`?debug=true`) or `localStorage.setItem('SE_DEBUG', '1')`.
- **Visual overlays** (via `?debug=overlay`): tile grid lines, trigger zone bounds, collision bounds, dialogue graph highlights, actor state labels.
- **`StoryEngine.debug` global console object:**
  - `jumpToBeat(id)` — skip to any beat in the current adventure.
  - `skipDialogue()` — auto-advance current dialogue.
  - `reloadAdventure()` — hot-reload the current adventure bundle.
  - `pauseBeats()` / `stepBeat()` / `resumeBeats()` — step-through for story beats.
  - `listBeats()` — dump beat graph to console.
  - `getState()` — return current game state (inventory, flags, current card/beat).
  - `setFlag(key, value)` — manually set a game state flag for testing.
- **Hot-reload:** during studio preview, JSON changes push via WebSocket (or polling fallback) and apply without full page reload.
- **Source maps:** always on in dev builds, stripped in production.
- **WebGL inspection:** document Spector.js setup for draw-call analysis when using PixiJS/WebGL.
- **Schema validation:** on load, validate `scene.json` and `adventure.json` against schemas. Errors include JSON path, expected type, and clear fix hints. Surface all errors at once (not fail-fast).
- **Version diffing:** studio UI supports diffing adventure.json between saves for change review.

### WYSIWYG Preview Architecture

Studios embed a sandboxed instance of the Engine Runtime for live preview:

- **Sandboxed iframe:** the preview pane runs the production Engine Runtime in an iframe, ensuring rendering parity. No separate "preview renderer."
- **`postMessage` communication:** the studio pushes scene/adventure data to the iframe; the preview renders it. Communication is one-directional (studio → preview) with optional status callbacks.
- **Hot-reload:** on every authoring change, the studio sends a delta update. The preview applies it without full reload — authors see changes in real time.
- **Same pipeline:** preview uses the identical rendering path as the player-facing runtime. If it looks right in preview, it looks right in production.

### Code Export Pipeline

Studios author in structured JSON; the export step produces an optimized, self-contained adventure bundle:

1. **Validate:** run schema checks on `scene.json` and `adventure.json`. Fail with clear errors if invalid.
2. **Tree-shake:** remove unused assets, unreachable beats, orphaned dialogue branches.
3. **Compile:** convert dialogue graphs to optimized lookup tables; resolve inventory-gated card transitions to fast state checks.
4. **Pack:** run atlas packing on sprites/tiles; generate multi-bitrate audio; compress with WebP + PNG fallback.
5. **Emit:** produce a self-contained bundle with a manifest + content-hashed asset filenames.
6. **Budget check:** pre-export validation against the perf budget (bundle size, sprite count, audio decode cost). Export fails if budget exceeded, with a report of what's over.

## Backend *(Backend Engineer)*

**Default posture:** serverless + static CDN until data proves otherwise.

**Candidate services (Sprint 2 decision):** Cloudflare Pages/Workers + R2, or Vercel + edge functions + S3.

**Concerns owned:**
- Content delivery (adventure bundles).
- Save/sync (start offline-first; sync optional).
- Telemetry — minimal, privacy-respecting, KPI-driven.
- Auth — deferred until sync is introduced.
- `$/MAU` cost model lives in [`wiki/performance-budget.md`](wiki/performance-budget.md).

### Deployment Topology

- **PWA baseline:** service worker for offline play + asset caching, web app manifest, HTTPS mandatory.
- **CDN:** adventure bundles served with content-hash URLs for perfect caching. Service worker pre-caches the current adventure on first load.
- **Edge/CDN evaluation:** test Cloudflare vs. Vercel for cold starts, caching behavior, and real $/MAU at projected scale. Include R2 object storage cost modeling for assets (Sprint 2).

### Save/Sync Architecture

- **Offline-first:** all save state persisted in IndexedDB via localForage. Game works fully offline.
- **Sync (when online):** last-write-wins for V1; conflict resolution strategy deferred to V2.
- **Save schema:** versioned. Migrations co-owned by frontend engineer + tester.
- **Data stored:** current card, beat progress, inventory, dialogue flags, session timer.

### Security Baseline

- **Content Security Policy (CSP):** no inline scripts, no `eval`, strict source whitelist.
- **Input sanitization:** all player-input text (names, custom labels) sanitized before render to prevent XSS.
- **Bundle integrity:** adventure bundles include a hash in the manifest; runtime verifies before execution.

## Mobile Wrapper (Sprint N)

Candidates: Capacitor, PWA-only, Tauri Mobile. Decision deferred until browser MVP is green against perf budget.

## Asset Pipeline

- **Atlas packing:** tiles/sprites → packed texture atlases at build time (TexturePacker CLI or custom script). No loose PNGs at runtime.
- **Image compression:** WebP with PNG fallback. Platform-specific: `--target=mobile` produces lower-resolution textures.
- **Audio optimization:** multiple bitrates generated per track (128 kbps desktop, 64 kbps mobile) with runtime fallback logic. Decode cost tested on real mobile devices, not just desktop.
- **Content-hash filenames:** all bundled assets get content-hash filenames for perfect CDN cache-busting.
- **Platform-specific builds:** build flags (`--target=mobile`, `--target=desktop`) control texture resolution, audio quality, and effect density.
- **Pre-commit hooks:** reject assets exceeding per-type size limits (caps defined in [`wiki/performance-budget.md`](wiki/performance-budget.md)).
- **Adventures:** bundled as a single archive with a manifest listing all assets, their hashes, and a total size check against the perf budget.

## Testing & Performance Gates *(Tester)*

See [`wiki/performance-budget.md`](wiki/performance-budget.md) and [`wiki/testing-strategy.md`](wiki/testing-strategy.md) for full details.

### Automated Tests
- **Unit tests:** core systems — dialogue graph traversal, trigger evaluation, beat state machine transitions, save/load serialization round-trips, inventory/card-unlock logic.
- **Integration tests:** full adventure load → render → input → beat progression. Headless browser (Playwright candidate). Run on every PR.
- **Visual regression:** snapshot testing for tilemap renders and dialogue box layouts. Baseline images committed; threshold for acceptable pixel diff.
- **Perf regression:** automated benchmark scene (200+ sprites, active dialogue, audio playing). Metrics captured: FPS p95, memory peak, frame time p99. CI gate fails if > 10% regression from baseline.
- **Bundle & Lighthouse:** every PR checks bundle size via `size-limit`. Lighthouse CI thresholds: performance > 90, accessibility > 90, PWA pass.

### Manual / Playtesting
- **Session timing:** force 5-minute playthroughs of prototypes; measure emotional payoff, pacing, and actual session length (directly addresses R2).
- **Device matrix:** desktop Chrome, Firefox, Safari; Android Chrome on 3-year-old midrange device; iOS Safari. Include touch vs. mouse/keyboard input.
- **Narrative flow:** playtests focused on dialogue flow, choice meaningfulness, card transitions, and "no wasted time" rule. Record session length and drop-off points.
- **Cross-browser:** Chrome, Firefox, Safari (especially mobile Safari).

### Beat / Story Testing
- Prototype 2–3 full micro-adventures early (Sprint 5 target) and run structured playtests.
- Track metrics: time per beat, choice engagement rate, card discovery rate, replay intent.
- Use `StoryEngine.debug` console to step through beats during authoring QA.

## Open Questions
Tracked in [`sprints/sprint-01.md`](sprints/sprint-01.md) research section, carried forward each sprint.
