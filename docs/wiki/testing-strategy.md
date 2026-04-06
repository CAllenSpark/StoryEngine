# Testing Strategy

> Sprint 1.5 seed. Owner: Tester. See also: [`performance-budget.md`](performance-budget.md), [TDD testing section](../tdd.md).

## Testing Pyramid

```
         ╱ Manual Playtesting ╲        ← smallest layer (high cost, high signal)
        ╱  Perf Regression     ╲
       ╱  Visual Regression     ╲
      ╱  Integration Tests       ╲
     ╱  Unit Tests                ╲    ← largest layer (low cost, fast feedback)
```

## Unit Tests

**What to test** (core systems, pure logic):
- Dialogue graph traversal — correct node reached for every branch condition.
- Trigger evaluation — triggers fire exactly when conditions are met.
- Beat state machine — valid transitions, no invalid state combinations.
- Save/load serialization — round-trip fidelity (save → serialize → deserialize → compare).
- Inventory/card-unlock logic — item collected → correct card unlocked, no false unlocks.
- Media trigger dispatch — correct media type + payload for each trigger event.

**Framework:** TBD Sprint 2 (candidates: Vitest, Jest). Coverage target: critical paths, not a percentage.

## Integration Tests

**Scenario:** full adventure load → render → input simulation → beat progression → adventure completion.

- Run in headless browser (Playwright candidate).
- Verify: correct card rendered, dialogue displayed, choices functional, beats advance in order, inventory gates work.
- Run on every PR.
- Target: a "smoke test" adventure that exercises the full core loop (explore → talk → choice → beat → card transition).

## Visual Regression

- **Snapshot testing** for tilemap renders, dialogue box layouts, card transitions.
- Baseline images committed to the repo.
- Pixel-diff threshold: configurable, default < 0.1% changed pixels.
- Tools: Playwright screenshot comparison or custom pixel-diff script.
- Updated whenever intentional visual changes land (author must approve new baseline).

## Performance Regression

- **Benchmark scene:** 200+ sprites (mix of tiles and actors), active dialogue, audio playing, one card transition.
- **Metrics captured:** FPS p95, memory peak (RSS), frame time p99, draw call count.
- **CI gate:** fails if any metric regresses > 10% from the committed baseline.
- **Baseline refresh:** after intentional perf-impacting changes, the team can update the baseline with documented rationale.
- **Real measurement:** use `performance.now()` around the render loop, `PerformanceObserver` for long tasks.

## Bundle & Lighthouse Gates

Run on every PR:
- **`size-limit`:** configured per package — engine runtime, player shell, per-adventure bundle. Fails if budget exceeded.
- **Lighthouse CI:**
  - Performance score > 90
  - Accessibility score > 90
  - PWA audit: pass
  - Best Practices: pass
- Results posted as PR comment for visibility.

## Manual Playtesting Protocol

Not replaceable by automation. Run at sprint milestones and before any release.

### Session Timing Test
- Play through a prototype adventure with a stopwatch.
- Target: 4–6 minutes from first input to resolution.
- Record: actual duration, perceived pacing ("too slow in the middle," "ending felt rushed"), emotional payoff.

### Device Matrix
| Device | Browser | Input | Cadence |
|---|---|---|---|
| Desktop (any modern) | Chrome, Firefox, Safari | Mouse + keyboard | Every PR (CI) |
| Android midrange (3yr old) | Chrome | Touch | Monthly manual |
| iOS (2yr old iPhone) | Safari | Touch | Monthly manual |
| Tablet (any) | Chrome/Safari | Touch | Quarterly |

### Narrative Flow Checklist
- [ ] Every dialogue choice leads to a meaningful beat (no dead ends).
- [ ] No beat takes more than 60 seconds.
- [ ] Inventory-gated cards have clear hint paths (player knows what to look for).
- [ ] Card transitions feel intentional, not jarring.
- [ ] Session completes cleanly — no dangling state.

### Cross-Browser
- Chrome, Firefox, Safari desktop.
- Mobile Safari (especially: audio autoplay, viewport scaling, touch event handling).
- Android Chrome (especially: memory limits, WebGL context loss recovery).

## Beat / Story Testing

From Sprint 5 onward (first prototype adventures):
- Author 2–3 micro-adventures with different structures (linear, branching, discovery-heavy).
- Run structured playtests with external testers or friends.
- **Metrics to track:**
  - Time per beat (are any beats too long or too short?)
  - Choice engagement rate (do players read and consider choices, or click through?)
  - Card discovery rate (do players find gated cards, or get stuck?)
  - Replay intent ("would you play another?")
- **Tool:** `StoryEngine.debug.getState()` + telemetry events for automated metric collection during playtests.

## Real Device Testing

- **CI covers:** desktop Chrome + emulated mobile viewport.
- **Emulation is not a substitute** for real device testing — memory limits, GPU behavior, touch precision, and audio decode differ significantly.
- **Monthly cadence:** physical Android (3-year-old midrange) + iOS Safari (2-year-old iPhone).
- **Results:** logged in the sprint doc with device model, OS version, and any issues found.
- **Escalation:** any device-specific failure blocks the next release until resolved or formally waived by PM.
