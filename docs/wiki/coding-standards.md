# Coding Standards

> Sprint 1 seed. Owner: Frontend Engineer. Accountable: Design Leader.

## Component Size
- **Components stay under 200 lines.** Hard guideline, not a hard limit.
- If a component would exceed 200, evaluate whether it contains distinct concerns:
  - **Data fetching** → extract into a hook or loader.
  - **Sub-UI sections** → extract as child components.
  - **Reusable logic** → extract into a shared module.
- Split at those **natural boundaries**.
- **Never split purely to meet a line count.** A coherent 220-line component beats three artificial fragments.

## Hooks
- **Always extract stateful logic into custom hooks.** State + effects that represent a concept (e.g. `useSceneLoader`, `useInputMap`, `useAudioBus`) live in their own hook.
- Hooks are named `useXxx` and return a minimal surface.

## Performance (non-negotiable on every PR)
- Every change states its impact on **memory, frame rate, and cost**.
- Object pool hot objects; never allocate inside the render loop.
- Use texture atlases; never load loose images at runtime.
- Render on change; don't redraw when nothing moved.
- Profile before optimizing; don't guess.

## Libraries
- No dependency added without a bundle-size + mobile + license check (Researcher + Frontend Eng sign-off).
- Prefer standard browser APIs over polyfills.

## Review Checklist
- [ ] Under 200 LOC, or split-reasoned in PR description.
- [ ] Stateful logic in hooks.
- [ ] Perf impact stated (mem / FPS / bundle / cost).
- [ ] No new deps, or trade-off review linked.
- [ ] Accessibility baseline met (keyboard, SR labels, touch targets).
- [ ] Tests + perf gate green (Sprint 2+).
