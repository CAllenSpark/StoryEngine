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
