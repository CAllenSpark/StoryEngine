# Process

> Sprint 1 seed. Owner: PM.

## Sprint Cadence
- Sprints are goal-sized, not time-boxed, until the team has velocity data.
- Each sprint has a **single primary goal** ratified in plan mode.
- Sprint artifacts live in [`docs/sprints/sprint-NN.md`](../sprints/).

## `opusplan` Workflow
`opusplan` is Claude Code's model alias that uses **Opus in plan mode** and **Sonnet in execution mode**.

**Every sprint session starts with:**
1. `/model opusplan`
2. Enter plan mode for sprint planning, architecture choices, or any mid-sprint pivot.
3. Exit plan mode — Sonnet automatically takes over for implementation.
4. Return to plan mode for any new architectural decision.

This keeps deep reasoning on Opus and fast iteration on Sonnet, balancing quality and cost.

## Definition of Done (sprint level)
- [ ] Primary goal met.
- [ ] Each owning agent has updated its docs.
- [ ] Dashboard refreshed by PM.
- [ ] Wiki updated by Researcher where new knowledge landed.
- [ ] Perf regression green (Sprint 2+).
- [ ] Retro appended to the sprint doc.
- [ ] Commit + push to the active feature branch.

## Definition of Done (PR level, Sprint 2+)
- [ ] Components < 200 LOC (or split-reasoned).
- [ ] Stateful logic in custom hooks.
- [ ] Perf impact stated.
- [ ] Perf gate green.
- [ ] Accessibility baseline met.
- [ ] Tests updated.
- [ ] Any new dep has a linked trade-off review.

## End-of-Sprint Ritual (every agent runs it)
1. Update owned docs.
2. PM updates dashboard.
3. Researcher updates wiki.
4. Tester posts perf regression results (Sprint 2+).
5. Append retro to sprint doc.
6. Commit + push.
