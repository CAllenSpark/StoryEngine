# Risk Register — StoryEngine

> Sprint 1 seed. Owner: PM. Reviewed every sprint.

Severity: L / M / H. Status: Open / Mitigating / Accepted / Closed.

| # | Category | Risk | Severity | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|
| R1 | Tech | Rendering perf on low-end mobile cannot hit 30 FPS with target sprite count | H | Frontend Eng | Pick rendering stack with proven mobile story in Sprint 2; run perf spike before committing to Sprint 3 features | Open |
| R2 | Design | 5-minute constraint starves narrative depth | H | Design Leader | Prototype three micro-adventures in Sprint 5; playtest for session length + emotional payoff | Open |
| R3 | Production | Asset throughput (tiles, sprites, audio) becomes the bottleneck | M | Artist | Lock style guide + palette early; reuse tile libraries across adventures | Open |
| R4 | Market | Discoverability in a crowded narrative-game space | M | PM | Lean into "5-minute ritual" positioning; closed beta with hand-picked fans first | Open |
| R5 | Legal | Third-party asset/font/audio licensing costs or restrictions | M | Backend Eng | Original assets only, or permissively licensed with explicit provenance log | Open |
| R6 | Tech | Bundle size creeps past 5 MB JS budget | M | Frontend Eng | CI size gate from Sprint 2 | Open |
| R7 | Cost | Backend/CDN $/MAU exceeds ceiling at scale | M | Backend Eng | Serverless + static CDN default; model cost before each new service is added | Open |
| R8 | Team | Cross-discipline thrash (scope, vision, budget conflicts) | L | PM + Design Leader | Clear RACI in `team/TEAM.md`; end-of-sprint ritual enforces alignment | Open |
| R9 | Tool | WYSIWYG studio complexity — embedding runtime in authoring tool doubles surface area | H | Frontend Eng | Sandboxed iframe approach limits blast radius; reuse production runtime, don't fork it | Open |
| R10 | Scope | Media extensibility (video, rich media) creeps into early sprints before core is solid | M | PM | Define extensible schema now but defer implementation past M4; gate behind feature flag | Open |
| R11 | Design | Card/location metaphor constrains spatial design — some stories may need scrolling or connected spaces | M | Design Leader | Prototype card transitions early (Sprint 3–4); allow cards to be multi-screen if needed | Open |
| R12 | Tech | Code export pipeline adds build complexity and new failure modes | M | Frontend Eng | Start with "enhanced JSON bundle" (validated + tree-shaken); full code compilation is a later milestone | Open |
| R13 | Tool | Game Design Studio UX — if clunky, creators abandon it for Twine + custom code | H | Frontend Eng | Sprint 2 wireframes; Sprint 3 prototype playtest; iterate before scaling content | Open |
| R14 | Ops | Content velocity — weekly publishing requires editorial headcount (writer, artist, QA) we may not have | M | PM | Start with monthly cadence; validate team throughput before committing to weekly | Open |
| R15 | Tech | World state migration — new episodes may require snapshot schema changes that break older saves | M | Frontend Eng | Schema versioned with forward migrations; migrations are deterministic + idempotent | Open |
| R16 | Design | AI companion safety — LLM responses could break character, spoil story, or produce inappropriate content | M | Design Leader | System prompt guardrails, post-filter, provider-side safety; fallback to scripted on any failure | Open |
| R17 | Legal | GDPR, COPPA, ToS, Privacy Policy needed before public launch | H | PM | Consult lawyer pre-M4; ship 13+ for MVP; defer COPPA unless targeting under-13 | Open |
| R18 | Tech | Shared asset cache invalidation — updating a shared character sprite must not break 50+ published episodes | M | Frontend Eng | Immutable asset references; old episodes keep old version; new episodes use new version | Open |
