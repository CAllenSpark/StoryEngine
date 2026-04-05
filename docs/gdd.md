# Game Design Document — StoryEngine

> Sprint 1 seed. Editor-in-chief: Design Leader. Contributions from Artist, Animator, Audio Director.

## Pillars
1. Story-first.
2. 5-minute shape.
3. LucasArts-style interactivity.
4. Handcrafted sprite charm.
5. Runs anywhere, cheap.

## Core Loop
**Explore → Talk → Solve → Story Beat → Next Beat → Resolution.**

A player enters a scene, clicks to explore, talks to characters, solves a light puzzle or makes a meaningful choice, and the story advances. Five beats fit inside a 5-minute session with a clean ending.

## Micro-Adventure Shape
- **Minute 0–1:** Hook — establish character, place, stakes.
- **Minute 1–3:** Exploration + dialogue + one small puzzle/choice.
- **Minute 3–4:** Turn — stakes raise, a decision matters.
- **Minute 4–5:** Resolution — the beat lands; clean finish.

No fail states that waste the player's time. Dead ends resolve into hints.

## Tone
Warm, curious, gently funny — the space between Day of the Tentacle's charm and A Short Hike's quiet generosity.

## Art Direction *(Artist)*
- Resolution target TBD Sprint 2 (candidate: 320×180 internal, scaled).
- Fixed per-biome palettes.
- Tile grid size TBD Sprint 2 (candidate: 16×16).
- All art in texture atlases.
- Style guide lives at [`wiki/` — TBD](wiki/).

## Animation Direction *(Animator)*
- Prefer fewer, more expressive frames.
- Animation must not block input or pace.
- Frame budgets per actor documented in production.

## Audio Direction *(Audio Director)*
- Short loopable stems with procedural variation over long baked tracks.
- Music + SFX budgeted for size and decode cost.
- Graceful degradation on low-end mobile (bitrate fallbacks, muted mode).

## Writing Direction *(Design Leader)*
- Dialogue under 3 lines per bubble.
- Every line reveals character or advances the beat. Cut the rest.
- Choices reflect character, not stats.

## Reference Library
See [`sprints/sprint-01.md`](sprints/sprint-01.md) research section.
