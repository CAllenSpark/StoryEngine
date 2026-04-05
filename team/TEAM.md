# StoryEngine Team

Shared team document. Single source of truth for who owns what and how we work together.

## Roster

| Agent | File | Primary Docs Owned |
|---|---|---|
| Product Manager | [`.claude/agents/product-manager.md`](../.claude/agents/product-manager.md) | [`docs/prd.md`](../docs/prd.md), [`dashboard/DASHBOARD.md`](../dashboard/DASHBOARD.md), [`docs/kpis.md`](../docs/kpis.md) |
| Design Leader | [`.claude/agents/design-leader.md`](../.claude/agents/design-leader.md) | [`docs/gdd.md`](../docs/gdd.md), [`docs/brand-bible.md`](../docs/brand-bible.md) |
| Researcher | [`.claude/agents/researcher.md`](../.claude/agents/researcher.md) | Sprint research sections, wiki references |
| Frontend Engineer | [`.claude/agents/frontend-engineer.md`](../.claude/agents/frontend-engineer.md) | [`docs/tdd.md`](../docs/tdd.md) (frontend) |
| Backend Engineer | [`.claude/agents/backend-engineer.md`](../.claude/agents/backend-engineer.md) | [`docs/tdd.md`](../docs/tdd.md) (backend) |
| UI/UX Designer | [`.claude/agents/ui-ux-designer.md`](../.claude/agents/ui-ux-designer.md) | [`docs/frd.md`](../docs/frd.md) (UX) |
| Artist | [`.claude/agents/artist.md`](../.claude/agents/artist.md) | GDD art sections, style guide |
| Animator | [`.claude/agents/animator.md`](../.claude/agents/animator.md) | GDD animation sections |
| Audio Director | [`.claude/agents/audio-director.md`](../.claude/agents/audio-director.md) | GDD audio sections |
| Tester | [`.claude/agents/tester.md`](../.claude/agents/tester.md) | [`docs/wiki/performance-budget.md`](../docs/wiki/performance-budget.md), QA checklists |

## RACI (docs → agents)

| Document | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| PRD | PM | PM | Design Leader, Researcher | All |
| FRD | UI/UX | PM | Frontend, Backend | All |
| GDD | Design Leader | Design Leader | Artist, Animator, Audio, PM | All |
| TDD | Frontend + Backend | Design Leader | Tester, Researcher | All |
| Brand Bible | Design Leader | PM | All creatives | All |
| KPIs | PM | PM | Backend, Tester | All |
| Risks | PM | PM | All | All |
| Dashboard | PM | PM | — | All |

## Working Agreements
1. **Perf, memory, cost on every decision.** No proposal is complete without impact stated.
2. **Components < 200 lines.** Split at natural concern boundaries (data fetching / sub-UI / reusable logic). Extract stateful logic into custom hooks. Never split purely to meet a line count.
3. **Read before you write.** Do not propose changes to code you haven't read.
4. **Ask before duplicating.** Check the wiki and existing docs before creating new material.
5. **`opusplan` always.** Plan with Opus, implement with Sonnet.
6. **End every sprint with the ritual.** See [`docs/wiki/process.md`](../docs/wiki/process.md).

## End-of-Sprint Ritual
- [ ] Each agent updates owned docs
- [ ] PM updates `dashboard/DASHBOARD.md`
- [ ] Researcher updates wiki
- [ ] Tester confirms perf budget (Sprint 2+)
- [ ] Retro appended to current sprint doc
- [ ] Commit + push
