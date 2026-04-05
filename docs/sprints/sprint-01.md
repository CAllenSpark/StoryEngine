# Sprint 1 — Team, Docs, Research Foundation

**Dates:** 2026-04-05 → (single-session sprint)
**Primary Goal:** Establish the AI agent team, documentation spine, dashboard, wiki, and first research report. No engine code.
**Status:** ✅ Complete

## Team (persistent in `.claude/agents/`)
- Product Manager, Design Leader, Researcher, Frontend Engineer, Backend Engineer, UI/UX Designer, Artist, Animator, Audio Director, Tester.

## Deliverables
- 10 persistent sub-agents under `.claude/agents/`.
- `.claude/README.md` documents the `opusplan` workflow.
- `team/TEAM.md` — roster, RACI, working agreements.
- `dashboard/DASHBOARD.md` — milestones, KPIs, risks, sprint log.
- Docs: `prd.md`, `frd.md`, `gdd.md`, `tdd.md`, `brand-bible.md`, `kpis.md`, `risks.md`.
- Wiki: `README.md`, `architecture.md`, `coding-standards.md`, `performance-budget.md`, `glossary.md`, `process.md`.
- This sprint report.

---

## Research Report (Sprint 1)

Researcher-led; contributions from each discipline. Findings inform Sprint 2's stack ratification.

### 1. Reference Games — What We Steal
| Game | What We Steal |
|---|---|
| Monkey Island / Day of the Tentacle (LucasArts) | Click-to-explore, dialogue-first pacing, charm, no-fail design |
| Zelda: A Link to the Past | Tile grid feel, expressive sprite silhouettes |
| Final Fantasy VI | Character-driven beats, compact emotional arcs |
| A Short Hike | Generosity to the player, session shape |
| Florence | Narrative compression, silent expressiveness |
| Thimbleweed Park | Modern LucasArts-style authoring pipelines |
| Stardew Valley | Handcrafted sprite aesthetic, palette discipline |

### 2. Rendering Tech Scan *(Frontend Engineer + Researcher)*
| Option | Pros | Cons | Mobile Story |
|---|---|---|---|
| **PixiJS** | Mature sprite batching, good ecosystem, Canvas2D fallback | Larger bundle (~300–500 KB) | Strong |
| **Phaser** | Batteries-included game framework | Heavy, opinionated, ~1 MB | Strong |
| **Custom Canvas2D** | Smallest bundle, simplest mental model | Perf ceiling, we write everything | OK on mid-range; risk on low-end |
| **WebGPU direct** | Future-facing, best perf headroom | Mobile Safari support still catching up | Medium-term risk |

**Leaning:** PixiJS as primary candidate; Canvas2D as fallback for the simplest scenes. **Decision deferred to Sprint 2** after a measured perf spike.

### 3. Tile / Asset Pipeline Options *(Artist + Frontend Engineer)*
- **Tiled (.tmx)** — industry standard, mature, opinionated format.
- **LDtk** — modern, JSON-native, great DX, MIT licensed.
- **Custom** — lets Tile Creator Studio own the format end-to-end.

**Leaning:** LDtk-inspired JSON for Sprint 2 prototypes; revisit custom once Tile Creator Studio ships in Sprint 3.

### 4. Mobile Delivery *(Frontend Engineer + Backend Engineer)*
| Option | Pros | Cons |
|---|---|---|
| **PWA only** | Zero wrapper overhead, instant updates | No store presence, iOS install friction |
| **Capacitor** | Store presence, native APIs when needed, single web codebase | Wrapper overhead, review cycles |
| **Tauri Mobile** | Tiny runtime, Rust-backed | Still maturing on mobile |

**Leaning:** PWA for browser MVP; Capacitor for first store submission. **Decision deferred until browser MVP hits perf budget.**

### 5. Audio *(Audio Director)*
- **Howler.js** — mature, good fallback behavior, small.
- **WebAudio direct** — maximum control, more code.

**Leaning:** Howler for Sprint 2 prototype to prove adaptive audio rules quickly; revisit WebAudio direct if bundle/budget requires.

### 6. Backend & Cost *(Backend Engineer)*
- **Cloudflare Pages + Workers + R2** — aggressive free tier, cheap egress, global.
- **Vercel + edge functions + S3** — great DX, higher egress cost at scale.
- **Static host + no backend** — viable for MVP; add functions only when sync appears.

**Leaning:** Cloudflare stack for cost ceiling, static-only for MVP. $/MAU model to be built in Sprint 2.

### 7. Monetization & Discoverability Hypotheses *(PM)*
- **H1:** Premium, ad-free, one-time per adventure pack (3–5 adventures per pack).
- **H2:** Subscription for "a new story every week" ritual.
- **H3:** Free first adventure, paid library.
- **Anti-hypothesis:** ads or engagement loops that fight the 5-minute shape.

All three to be tested against positioning and playtest feedback post-MVP.

### 8. Open Questions → Sprint 2 Backlog
1. Ratify rendering stack with a measured spike (target: 200 animated sprites at 30 FPS on a 3-year-old Android).
2. Ratify backend provider.
3. Commit to an adventure bundle format and manifest schema.
4. Decide tile grid size and internal resolution.
5. Draft the perf regression CI gate.
6. Scaffold monorepo: `apps/web`, `packages/engine`, `packages/shared`.
7. Define the `$/MAU` cost model with numbers.

---

## Retro

**What shipped:** 28 foundation files, 10 persistent agents, dashboard + wiki + design docs seeded, research report complete.

**What went well:** Clear ownership via RACI. Every agent has perf/memory/cost as a non-negotiable baked into its charter. `opusplan` workflow documented in two places so it's hard to miss.

**What to watch:** The 200-line + hooks rule needs teeth once Sprint 2 starts shipping code — Tester should wire the check into CI early.

**Next sprint goal (proposed):** Ratify rendering stack and backend provider, scaffold the monorepo, and render a tilemap + 200 sprites at perf budget on a low-end Android target. Establish CI perf gate.
