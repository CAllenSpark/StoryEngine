# Performance Budget

> Sprint 1 seed. Owner: Tester. Consulted: Frontend Eng, Backend Eng, Artist, Audio Director.

All numbers are **draft targets**. Sprint 2 ratifies them after a measured spike.

## Runtime Targets

| Metric | Desktop | Low-end Mobile |
|---|---|---|
| p95 frame time | ≤ 16.6 ms (60 FPS) | ≤ 33 ms (30 FPS) |
| Memory RSS | ≤ 300 MB | ≤ 150 MB |
| Cold start | < 2 s | < 3 s |
| Input latency | ≤ 50 ms | ≤ 80 ms |
| Sprite count (on-screen) | 300 | 150 (tiles + actors + UI) |
| Audio decode latency | ≤ 100 ms | ≤ 200 ms |
| First Contentful Paint | ≤ 1.5 s | ≤ 2 s (on 3G) |
| Full bundle load | ≤ 3 s | ≤ 5 s (on 3G) |

## Payload Targets

| Asset | Budget |
|---|---|
| Initial JS (engine + shell) | ≤ 5 MB |
| Per-adventure bundle | ≤ 2 MB |
| Audio track (looped stem) | ≤ 200 KB |
| Tile atlas | ≤ 512 KB |
| Sprite atlas (per actor) | ≤ 256 KB |

## Cost Targets *(Backend Engineer)*

| Metric | Target |
|---|---|
| $/MAU ceiling | TBD Sprint 2 |
| CDN egress per play | tracked |

## Monitoring Implementation

- **`?debug=perf` overlay:** FPS, frame time, draw calls, sprite count, memory estimate. Uses `performance.now()` around the render loop. Zero-cost when disabled.
- **Browser APIs:** `performance.now()` (frame timing), `navigator.deviceMemory` (adaptive quality), `PerformanceObserver` (FCP/LCP), `ResizeObserver` (viewport changes + scaling).
- **Production telemetry:** minimal, opt-in. Collected per session: p95 frame time, memory high-water mark, session duration, adventure completion. No PII.

## CI Gates

- **`size-limit`:** configured per package (engine runtime, player shell, adventure bundle). Fails PR if budget exceeded.
- **Lighthouse CI:** performance > 90, accessibility > 90, PWA pass. Results posted as PR comment.
- **Perf regression benchmark:** automated scene (200+ sprites, active dialogue, audio). FPS p95 + memory peak measured. Fails if > 10% regression from committed baseline.
- **Pre-commit asset hooks:** reject assets exceeding per-type size limits (see Payload Targets).
- All gates **block merge** until resolved or formally waived by PM with documented rationale.

## Real Device Testing

- CI covers desktop Chrome + emulated mobile viewport.
- **Monthly manual pass** on physical devices: Android (3-year-old midrange), iOS Safari (2-year-old iPhone).
- Emulation is not a substitute — memory limits, GPU behavior, touch precision, and audio decode differ significantly on real hardware.
- Results logged in the sprint doc with device model, OS version, and issues found.

## Enforcement

From Sprint 2 onward:
- PRs touching the engine run a **perf regression gate** (Tester owned).
- Size gate on bundles (CI).
- Violations block merge until resolved or formally waived by PM.

## Audio Budget Detail *(Audio Director)*
- Prefer short loopable stems + procedural variation.
- Mobile fallback bitrates mandatory.
- Decode cost measured, not assumed.

## Art Budget Detail *(Artist)*
- Fixed per-biome palettes for compression and coherence.
- Every asset carries a documented memory footprint in its metadata.
