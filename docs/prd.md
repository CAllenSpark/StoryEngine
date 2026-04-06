# Product Requirements Document — StoryEngine

> Sprint 1 seed. Owner: Product Manager. Expand every sprint.

## Vision
StoryEngine delivers **scalable micro-adventures** — charming, sprite-based interactive stories experienced in **5-minute play sessions**. More story with some gameplay than a game with story. Browser first, mobile next.

StoryEngine's authoring tools are a **modern HyperCard system**: designers see what players see (WYSIWYG), author in cards and locations rather than code, and publish via code export. The workflow is **author → preview → publish**, not write → compile → test. The engine supports **episodic world-building** — the same world and characters persist across chapters, with new story beats daily and locations expanding through inventory and discovery. Think: what if LOST were a daily 5-minute pixel adventure where you play Jack exploring the island, talking to survivors, collecting clues, and unlocking new locations — with Inkle-style multi-path branching and shorter play loops.

## Target Player
The "5-minute story seeker": adults who love narrative games but rarely have 30+ minute blocks. Commuters, lunch-breakers, parents between tasks. They want emotional payoff, charm, and a clean finish in a single sitting.

## Pillars
1. **Story-first.** Every system serves a beat.
2. **5-minute shape.** Every adventure has a clean start, middle, and end in 4–6 minutes.
3. **LucasArts-style interactivity.** Click-to-explore, dialogue-driven, light puzzles, no fail states that waste the player's time.
4. **Handcrafted sprite charm.** Tile-based environments, expressive sprites, audio that carries emotion.
5. **Runs anywhere, cheap.** Performance, memory, and cost are creative constraints.
6. **Authoring is designing, not coding.** The studios are creative environments in the HyperCard / Twine / Ink lineage — WYSIWYG, card-based, with code export for publishing. Designers focus on layout, interactive elements, characters, and narrative.

## Platforms
- **V1:** Modern desktop + mobile browsers (Chromium, Safari, Firefox).
- **V2:** Native mobile wrappers (decision: Capacitor vs. PWA vs. Tauri Mobile — Sprint 2 research).

## Core Components
- **Tile Creator Studio** — author environment assets and tilemaps with live WYSIWYG preview of the runtime rendering.
- **Game Design Studio** — creative authoring environment for cards/locations, actors, dialogue, triggers, and multi-path narrative. WYSIWYG preview and code export for publishing. Authors think in cards and story beats, not coordinates and code.
- **Game Engine Runtime** — render sprites, play audio, drive interactions, fire media triggers. Reads world state snapshot on episode start; writes updated snapshot on completion.
- **Player Shell** — browse, download, and play micro-adventures. Manages library, member status, and episode recaps.
- **AI Companion *(Roadmap, M7+)*** — optional BYOK (bring-your-own-key) LLM-powered partner character. Scripted by default; comes to life with a player-provided API key. See [`wiki/ai-companion.md`](wiki/ai-companion.md).

## Episodic Publishing Cadence
- **Target:** one new episode per week during active development.
- **Workflow:** author in studio → WYSIWYG preview → content approval → code export → publish to CDN → library manifest update.
- **World state:** episodes act in isolation. Each reads a snapshot of the world at the end of the previous episode. No live cross-episode state — just a simple ordered chain. See [`wiki/world-state.md`](wiki/world-state.md).
- **Publishing details:** See [`wiki/publishing-workflow.md`](wiki/publishing-workflow.md).

## Monetization Model
**Minecraft-style early access:**
- First X episodes are **free** — the proving ground. Players experience the world and decide if they want more.
- **One-time "member" purchase** unlocks everything: all current episodes + all future updates as they ship.
- Value grows over time as the catalog expands — early members get the best deal.
- **No micro-payments.** No per-episode pricing. No subscription tiers. No DLC packs. No ads.
- Technical implementation is simple: a single free/member binary check. See [`wiki/publishing-workflow.md`](wiki/publishing-workflow.md) for library manifest `isFree` flag.

## Media Extensibility
- **Current:** pixel sprites, tile maps, audio stems, SFX.
- **Future:** video sequences, animated backgrounds, rich media triggers (extensible by type).
- **Design principle:** data schemas include a `mediaType` field from day one. Media triggers use a `type + payload` pattern so new media types can be added without schema-breaking changes. Implementation of future types is deferred past M4, but the schemas accommodate them now.

## Success
See [`kpis.md`](kpis.md). North star: completed micro-adventures per user per week.

## Non-Goals (for now)
- Open-world exploration.
- Combat systems.
- Multiplayer.
- Public UGC marketplace (internal authoring only until post-M4).
- Per-episode pricing, subscription tiers, or ad-supported model.
