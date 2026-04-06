# KPIs — StoryEngine

> Sprint 1 seed. Owner: PM. Measurement begins Sprint 2+.

## North Star
**Completed micro-adventures per user per week.** Measures the *ritual* — not time spent, not sessions started, but stories finished.

## Activation (first 24h)
| Metric | Target |
|---|---|
| Cold start to first input | < 3 s |
| First adventure completion rate | ≥ 70% of first sessions |
| Time-to-first-feel-something | < 90 s |

## Engagement (ongoing)
| Metric | Target |
|---|---|
| Avg session length | 4–6 min |
| Sessions per active week | ≥ 3 |
| % sessions that complete the adventure | ≥ 80% |

## Quality Guardrails
| Metric | Target |
|---|---|
| Crash-free sessions | ≥ 99.5% |
| p95 frame time (desktop) | ≤ 16.6 ms (60 FPS) |
| p95 frame time (low-end mobile) | ≤ 33 ms (30 FPS) |
| Memory RSS (mobile) | ≤ 150 MB |
| Initial JS payload | ≤ 5 MB |
| Per-adventure asset bundle | ≤ 2 MB |
| Cold start | < 3 s |

## Cost Guardrails *(Backend Engineer)*
| Metric | Target |
|---|---|
| $/MAU ceiling | TBD Sprint 2 |
| CDN egress per adventure play | tracked |
| Backend ops burn rate | tracked monthly |

## Editorial Analytics *(Sprint 3+)*
Per-episode dashboards for editors. See [`wiki/telemetry.md`](wiki/telemetry.md).

| Metric | Purpose |
|---|---|
| Per-beat engagement (% started, % completed) | Identify pacing issues |
| Dialogue choice distribution | Identify dominant/unused branches |
| Drop-off waterfall (by beat) | Find where players abandon |
| Session duration by beat | Validate 5-minute shape per beat |
| Card discovery rate | Measure exploration success |

## Monetization Metrics *(with member system)*
| Metric | Target |
|---|---|
| Free-to-member conversion rate | tracked |
| Time-to-convert (free episodes before purchase) | tracked |
| Monthly active members | tracked |
| Catalog value perception (survey) | tracked quarterly |

## Anti-Metrics
Metrics we **refuse** to optimize for, because they conflict with the pillars:
- Total session time.
- Daily notification CTR.
- Streak length.
- Per-episode revenue (it's all-or-nothing membership, not per-episode sales).
