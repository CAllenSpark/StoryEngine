# Product Requirements Document — StoryEngine

> Sprint 1 seed. Owner: Product Manager. Expand every sprint.

## Vision
StoryEngine delivers **scalable micro-adventures** — charming, sprite-based interactive stories experienced in **5-minute play sessions**. More story with some gameplay than a game with story. Browser first, mobile next.

## Target Player
The "5-minute story seeker": adults who love narrative games but rarely have 30+ minute blocks. Commuters, lunch-breakers, parents between tasks. They want emotional payoff, charm, and a clean finish in a single sitting.

## Pillars
1. **Story-first.** Every system serves a beat.
2. **5-minute shape.** Every adventure has a clean start, middle, and end in 4–6 minutes.
3. **LucasArts-style interactivity.** Click-to-explore, dialogue-driven, light puzzles, no fail states that waste the player's time.
4. **Handcrafted sprite charm.** Tile-based environments, expressive sprites, audio that carries emotion.
5. **Runs anywhere, cheap.** Performance, memory, and cost are creative constraints.

## Platforms
- **V1:** Modern desktop + mobile browsers (Chromium, Safari, Firefox).
- **V2:** Native mobile wrappers (decision: Capacitor vs. PWA vs. Tauri Mobile — Sprint 2 research).

## Core Components
- **Tile Creator Studio** — author environment assets and tilemaps.
- **Game Design Studio** — compose scenes, actors, dialogue, triggers.
- **Game Engine Runtime** — render sprites, play audio, drive interactions.
- **Player Shell** — browse, download, and play micro-adventures.

## Success
See [`kpis.md`](kpis.md). North star: completed micro-adventures per user per week.

## Non-Goals (for now)
- Open-world exploration.
- Combat systems.
- Multiplayer.
- User-generated content publishing (internal authoring only until post-M4).
