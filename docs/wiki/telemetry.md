# Telemetry

> Sprint 1.5 seed. Owner: Backend Engineer + PM. See also: [KPIs](../kpis.md), [TDD](../tdd.md).

## Principles

- **Privacy-first.** No PII. No tracking across adventures without opt-in. No account linking without explicit consent.
- **Editorial utility.** Every event exists to help editors make better episodes, not to optimize engagement loops.
- **Minimal by default.** Collect only what informs decisions. Expand carefully.
- **Opt-in production perf.** Performance telemetry is opt-in; players can disable it.

## Event Schema

### Core Events (ship from Sprint 2)

| Event | Payload | Purpose |
|---|---|---|
| `session_started` | `{ episodeId, engineVersion, deviceType, timestamp }` | Session counting |
| `beat_started` | `{ episodeId, beatId, timestamp }` | Pacing analysis |
| `beat_completed` | `{ episodeId, beatId, durationMs, timestamp }` | Per-beat timing |
| `dialogue_choice_made` | `{ episodeId, beatId, choiceId, choiceLabel, timestamp }` | Branch analysis |
| `card_discovered` | `{ episodeId, cardId, timestamp }` | Discovery rate |
| `inventory_item_collected` | `{ episodeId, itemId, timestamp }` | Progression tracking |
| `session_drop_off` | `{ episodeId, lastBeatId, durationMs, timestamp }` | Drop-off analysis |
| `adventure_completed` | `{ episodeId, durationMs, endingId, timestamp }` | Completion + ending analysis |

### Monetization Events (ship with member system)

| Event | Payload | Purpose |
|---|---|---|
| `paywall_shown` | `{ episodeId, timestamp }` | Conversion funnel |
| `member_purchase_completed` | `{ timestamp }` | Revenue tracking |
| `member_purchase_abandoned` | `{ timestamp }` | Friction detection |

### Performance Events (opt-in)

| Event | Payload | Purpose |
|---|---|---|
| `perf_session_summary` | `{ episodeId, fpsP95, memoryPeakMb, frameTimeP99Ms, deviceType }` | Real-world perf monitoring |

### AI Companion Events (ship with M7+)

| Event | Payload | Purpose |
|---|---|---|
| `companion_enabled` | `{ episodeId, provider, timestamp }` | Adoption rate |
| `companion_interaction` | `{ episodeId, beatId, responseLatencyMs }` | Quality monitoring |

## Session ID

- Ephemeral. Generated per session. Not linked to any account or device ID.
- If a player opts into cloud sync (member), the session ID is still ephemeral — sync uses a separate, user-controlled identifier.

## Aggregation & Dashboards

### Editorial Dashboard (Sprint 3+)

Editors see per-episode analytics:

- **Beat-level engagement heatmap:** % of players who started each beat, % who completed it, average duration.
- **Choice distribution:** per dialogue choice, what % of players chose each option.
- **Drop-off waterfall:** which beats lose the most players.
- **Session duration histogram:** distribution of total play times (are we hitting 4–6 min?).
- **Discovery rate:** % of players who found each gated card/location.

### Monetization Dashboard (with member system)

- Free-to-member conversion rate.
- Time-to-convert (how many free episodes before purchase?).
- Paywall abandonment rate.

### Performance Dashboard (Sprint 3+)

- p95 FPS by device type.
- Memory peak distribution.
- Frame time regression alerts (compare week-over-week).

## Crash / Error Reporting

- Integrate **Sentry** (or similar) for crash and error telemetry.
- On unhandled error: capture stack trace, device info (OS, browser, screen size), engine version, episode ID. **No PII.**
- Alert team if crash-free session rate drops below 99.5% (KPI target).
- Error events are separate from gameplay telemetry — different pipeline, different retention policy.

## Data Retention

- Gameplay events: aggregated within 24 hours; raw events retained 30 days, then deleted.
- Crash reports: retained 90 days.
- Performance summaries: retained 1 year (aggregated, anonymized).
- No data sold or shared with third parties.

## Implementation Notes

- **Client-side:** Lightweight event queue. Batched sends (every 30s or on session end). Falls back gracefully if offline (events queued in IndexedDB, sent on next online session).
- **Server-side:** Serverless function receives batched events → writes to a time-series store (e.g., Cloudflare Analytics Engine, or a simple append-only log in R2).
- **Dashboard:** Static page reading from aggregated data. No real-time requirement — hourly or daily refresh is sufficient.
- **Bundle cost:** Telemetry client adds < 5 KB to the engine bundle.
