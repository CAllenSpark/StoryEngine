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
