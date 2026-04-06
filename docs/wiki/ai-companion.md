# AI Companion — BYOK Character System

> **Roadmap item: M6 design, M7 prototype.** Build after the core narrative engine is solid and tested. Owner: Frontend Engineer + Design Leader.

## Concept

Every episode features a specific **partner character** — a companion who accompanies the player, offers guidance, reacts to events, and has their own personality and point of view.

**Without an API key:** The companion follows scripted dialogue trees, authored in the Game Design Studio like any other character. They are part of the normal adventure — a localized AI with pre-authored lines.

**With an API key:** The player provides their own LLM API key (Anthropic, OpenAI, etc.). The companion comes "to life" — able to improvise, personalize, draw on the player's play history, and offer deeper, more varied interactions. **The companion always stays in character** and acts as a **personified help system with a point of view.**

The core narrative and adventure progression are **unchanged**. The AI companion adds texture to interactions, not new branching paths or card unlocks.

## The X-Files Example

Player is Mulder. Scully is the companion.

**Without API key (scripted):**
> **Scully:** "Mulder, I found something in the lab. You should take a look."

**With API key (LLM-powered):**
> **Scully:** "You showed the compass to the hermit? Mulder, that was reckless — but it might explain the signal we picked up near the lighthouse. I've been thinking about the readings from the lab, and if the hermit's story about the tides is true, we may have less time than we thought."

The scripted version advances the plot. The LLM version does the same thing but with personalized context, callbacks to previous interactions, and more varied expression.

## Architecture (Draft)

### API Key Storage
- Player enters their API key in the settings menu.
- Key stored **locally only** (IndexedDB or localStorage). **Never sent to our servers.**
- Key is used for direct client-to-LLM-provider API calls.
- Player can remove the key at any time; companion reverts to scripted mode.

### Dialogue Flow
1. Engine encounters a dialogue node tagged `ai_companion: true`.
2. **If no API key:** render the scripted dialogue line (the default path, authored in Game Design Studio).
3. **If API key present:**
   a. Construct a prompt from:
      - **Character sheet:** personality, voice, knowledge boundaries, relationship to player character.
      - **Current world state:** inventory, discovered locations, character flags.
      - **Conversation history:** recent exchanges in this session (limited context window).
      - **Current beat context:** what just happened, what the player just did.
      - **Guardrails:** system prompt enforcing character voice, no spoilers, no breaking the 4th wall.
   b. Call the LLM API (player's key, player's usage).
   c. Filter the response: check for out-of-character content, spoilers, or excessive length.
   d. Render as dialogue bubble.
   e. If LLM call fails (timeout, rate limit, bad key): **fall back to scripted dialogue** silently.

### Rate Limiting
- Cap LLM calls per session (e.g., max 20 companion interactions per 5-minute adventure).
- This prevents runaway costs on the player's API key.
- Display a subtle indicator when companion is in LLM mode vs. scripted mode (optional, player's choice).

### Prompt Construction

```
System: You are Scully, a skeptical FBI agent and medical doctor.
You are accompanying Mulder on an investigation on a mysterious island.

RULES:
- Stay in character as Scully at all times.
- Never break the 4th wall or acknowledge you are an AI.
- Never spoil upcoming story beats. You only know what Scully would know.
- Keep responses under 3 lines (matches the dialogue bubble constraint).
- Guide the player toward the current objective without being heavy-handed.
- Reference the player's inventory and past choices when relevant.
- Be skeptical but supportive. Challenge Mulder's theories with evidence.

CURRENT STATE:
- Inventory: compass, map
- Current location: Lighthouse exterior
- Current beat: "investigate the signal"
- Mulder just: showed the compass to the hermit
- Hermit said: "The tides are changing. Follow the signal before the storm."

Mulder says: "What do you make of that, Scully?"
```

## What the Companion Does NOT Do

- **Does not change adventure structure.** Beat progression, card unlocks, and inventory changes are authored, not generated.
- **Does not make choices for the player.** The companion reacts and advises; the player decides.
- **Does not generate new content.** No new cards, triggers, or game mechanics. Only dialogue.
- **Does not access the internet.** The LLM call is a single API request with the constructed prompt. No web browsing, no external data.
- **Does not cost us anything.** Player's API key, player's usage, player's provider billing.

## Guardrails

| Guardrail | Implementation |
|---|---|
| Stay in character | System prompt enforces character voice. Post-filter checks for out-of-character phrases. |
| No spoilers | System prompt includes only current + past beat context, never future beats. |
| No 4th wall breaks | System prompt explicitly forbids acknowledging AI nature. |
| Response length | System prompt enforces ≤3 lines. Post-filter truncates if exceeded. |
| Graceful fallback | LLM failure (timeout, error, bad key) → silently render scripted line. |
| Content safety | Provider-side content filtering (Anthropic/OpenAI both have built-in safety). |

## Supported Providers

Document compatible LLM providers:
- **Anthropic (Claude)** — recommended. Strong instruction-following for character voice.
- **OpenAI (GPT)** — supported. Player provides their own API key.
- **Other providers** — any provider with a compatible chat completions API can work. We provide adapter interfaces.

Player selects their provider in settings alongside the API key.

## Timeline

| Milestone | Deliverable |
|---|---|
| M6 | Design spec: character sheet format, prompt templates, guardrail definitions, UX for key input |
| M7 | Prototype: one companion character in one episode, with LLM mode + scripted fallback |
| M7+ | Playtest: does LLM mode meaningfully improve engagement? Measure via telemetry (`companion_enabled`, `companion_interaction`) |
| Post-playtest | Ship or iterate based on data. If engagement lift is minimal, deprioritize. |

## Open Questions (for M6 design)

1. Should the companion have a visual indicator when in LLM mode vs. scripted mode? (Player preference? Always visible? Never visible?)
2. How much conversation history should the prompt include? (Last 5 exchanges? Entire session?)
3. Should the companion be able to remember across episodes? (Include world state in prompt? Or only current episode context?)
4. How do we handle providers with different rate limits and pricing? (Document recommended models per provider?)
5. Should there be a "companion personality slider" (more helpful ↔ more in-character)?
