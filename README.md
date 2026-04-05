# StoryEngine

A sprite-based interactive narrative engine for **5-minute micro-adventures** — more story with some gameplay than a game with story. Spiritual reference: classic LucasArts adventures, early Zelda, Final Fantasy. Browser first, mobile next.

## Core Components (planned)
- **Tile Creator Studio** — author environment assets and tilemaps.
- **Game Design Studio** — compose scenes, actors, dialogue, triggers.
- **Game Engine Runtime** — animated sprites, sound, music, interactables.
- **Player Shell** — browser + mobile wrapper.

## Where to Start
- Team & agents: [`team/TEAM.md`](team/TEAM.md)
- Dashboard: [`dashboard/DASHBOARD.md`](dashboard/DASHBOARD.md)
- Wiki: [`docs/wiki/README.md`](docs/wiki/README.md)
- Design docs: [`docs/`](docs/)
- Current sprint: [`docs/sprints/sprint-01.md`](docs/sprints/sprint-01.md)

## Working Rules
- Performance, memory, and cost are first-class considerations on every decision.
- Components stay under 200 lines; stateful logic extracted into custom hooks. Split only at natural concern boundaries.
- Use `/model opusplan` — Opus for planning/architecture, Sonnet for implementation.

Branch: `claude/sprite-story-engine-Fsslv`
