# Glossary

> Shared vocabulary. Add terms as they stabilize.

- **Adventure / Micro-Adventure** — a single self-contained 5-minute story. The atomic unit of play.
- **Beat** — one narrative unit inside an adventure (hook, turn, resolution, etc.). A typical adventure has ~5 beats.
- **Scene** — a spatial setting: a tilemap + actors + interactables.
- **Tile** — a single cell of environment art placed on a grid.
- **Tileset** — a packed atlas of tiles with metadata.
- **Actor** — any animated sprite that can move, speak, or be interacted with (player, NPC, creature).
- **Interactable** — a region or object the player can click/tap to trigger dialogue or events.
- **Trigger Zone** — an invisible region that fires an event when the player enters.
- **Dialogue Graph** — the branching structure of a conversation.
- **Adventure Bundle** — the packaged, signed archive delivered to the runtime.
- **Player Shell** — the library + session frame the player sees around any adventure.
- **Tile Creator Studio** — authoring tool for environments.
- **Game Design Studio** — authoring tool for actors, dialogue, beats, triggers.
- **Engine Runtime** — the browser/mobile code that plays an adventure.
- **Perf Budget** — the measurable ceiling on memory, frame time, bundle size, and cost.
- **opusplan** — Claude Code model alias: Opus in plan mode, Sonnet in execution mode.
- **Card** — a discrete location or screen in the world; the atomic spatial unit. Inspired by HyperCard stacks. One card = one tilemap + its actors + triggers + dialogue.
- **Location** — synonym for Card when referring to the in-world place it represents.
- **Chapter** — a collection of beats and cards forming one episode. A micro-adventure is one chapter.
- **Episode / Episodic World** — the ongoing, expanding world across chapters. Same characters and setting; new story beats each release.
- **Inventory** — items the player collects that unlock new cards/locations (e.g. "getting the compass" reveals the Cove).
- **Discovery Mechanic** — gameplay where collecting an item or gaining knowledge unlocks a new card.
- **Code Export** — the build step that converts authored studio data into a publishable, optimized runtime bundle (not just raw JSON).
- **WYSIWYG Preview** — live rendering inside the studios that shows exactly what the player will see, using the same rendering pipeline as the engine runtime.
- **Media Trigger** — an event that fires rich media (audio, sprites, and in the future video) in response to player actions or beat transitions.
