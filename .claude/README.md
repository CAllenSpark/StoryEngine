# `.claude/` — Agents & Workflow

This directory configures Claude Code for the StoryEngine project. Files here are versioned and persist across sessions for every contributor.

## Persistent Sub-Agents (`agents/`)

Ten specialist agents form the team. Each `*.md` file is auto-discovered by Claude Code as a sub-agent and can be invoked by name.

| File | Role |
|---|---|
| `product-manager.md` | Roadmap, scope, sprint goals, KPIs, dashboard owner |
| `design-leader.md` | Creative direction, GDD + brand editor-in-chief |
| `researcher.md` | Competitive analysis, tech scouting, reference library |
| `frontend-engineer.md` | Browser client, rendering, input, UI |
| `backend-engineer.md` | Save/sync, delivery, telemetry, cost/scale |
| `ui-ux-designer.md` | Player flows, HUD, accessibility, touch |
| `artist.md` | Tile art, sprites, palettes, style guide |
| `animator.md` | Sprite animation standards, frame budgets |
| `audio-director.md` | Music, SFX, adaptive audio |
| `tester.md` | Test strategy, perf regression gates, playtests |

All agents share a non-negotiable: **evaluate every proposal against memory, frame-rate, and cost impact** and prefer the lowest-impact option that meets the requirement.

## `opusplan` Workflow

`opusplan` is Claude Code's model alias that uses **Opus in plan mode** (deep reasoning, architecture, trade-offs) and **auto-switches to Sonnet on exit** (fast code generation).

**Ritual for every sprint session:**
1. `/model opusplan`
2. Enter plan mode for sprint planning, architecture choices, or mid-sprint pivots.
3. Exit plan mode — Sonnet takes over for implementation automatically.
4. Return to plan mode for any new architectural decision.

See `docs/wiki/process.md` for the full cadence.

## End-of-Sprint Ritual
1. Each agent updates the docs it owns.
2. `product-manager` updates `dashboard/DASHBOARD.md`.
3. `researcher` refreshes affected wiki pages.
4. `tester` confirms perf budget (Sprint 2+).
5. Sprint retro appended to `docs/sprints/sprint-NN.md`.
6. Commit and push to the active feature branch.
