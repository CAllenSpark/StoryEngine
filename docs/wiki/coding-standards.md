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

## Debugging & Logging Practices

- All debug logging is behind a flag check (`StoryEngine.debug.enabled`). Zero cost when disabled.
- **No bare `console.log` in production paths.** Use a structured logger that respects debug mode and can be silenced.
- Error messages include context: what failed, what was expected, and where (file path / JSON path for schema errors).
- Debug overlays create no DOM elements, attach no event listeners, and allocate no objects when debug mode is off.
- See [`debugging.md`](debugging.md) for the full developer tools reference.

## Error Handling Patterns

- **Missing assets:** load a placeholder sprite or silent audio + emit a console warning + continue rendering. Never crash.
- **Low memory:** detect via `navigator.deviceMemory` or memory pressure API. Reduce particle effects, lower audio quality, skip non-essential animations. Degrade gracefully, don't fail.
- **Schema validation failures:** surface all errors at once (not fail-fast). Each error includes JSON path, expected type, and a hint. Studio shows inline error markers.
- **Network failures:** offline-first design. Queue sync operations. Surface status to the player only if an action requires connectivity.

## Review Checklist
- [ ] Under 200 LOC, or split-reasoned in PR description.
- [ ] Stateful logic in hooks.
- [ ] Perf impact stated (mem / FPS / bundle / cost).
- [ ] No new deps, or trade-off review linked.
- [ ] Accessibility baseline met (keyboard, SR labels, touch targets).
- [ ] Tests + perf gate green (Sprint 2+).
- [ ] Debug logging uses structured logger, not bare console.log.
- [ ] Error states have fallback behavior (placeholder, degraded mode).
- [ ] Debug overlays have zero cost when disabled.
- [ ] Schema changes validated (scene.json / adventure.json).
- [ ] Bundle size delta reported by CI.
- [ ] Visual regression snapshots updated if render output changed.
