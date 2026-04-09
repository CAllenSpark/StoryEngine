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

## Accessibility Checklist (Non-Negotiable)

Every shipped feature must meet this baseline before merge. No exceptions without PM + Design Leader sign-off.

### Touch and Pointer
- [ ] All interactive elements have a minimum 44x44px touch target.
- [ ] Touch targets do not overlap; minimum 8px gap between adjacent targets.
- [ ] Drag interactions have a click/tap alternative (no drag-only operations).

### Keyboard Navigation
- [ ] All interactive elements are reachable via Tab / Shift-Tab.
- [ ] Custom widgets (grids, sliders, drag-reorder) support arrow key navigation.
- [ ] Modal dialogs trap focus and restore focus to the trigger element on close.
- [ ] Escape closes the topmost modal/popover.
- [ ] Visible focus indicators on all focusable elements (2px solid outline, #89b4fa or equivalent high-contrast color).
- [ ] No keyboard traps — the user can always Tab out of a component.

### Screen Readers
- [ ] All interactive elements have accessible names (aria-label, aria-labelledby, or visible text).
- [ ] Dynamic content changes use aria-live regions (polite for non-urgent, assertive for errors).
- [ ] Icon-only buttons have aria-label describing the action, not the icon.
- [ ] Form inputs have associated labels (explicit `<label>` or aria-labelledby).
- [ ] Range/slider inputs have aria-valuetext with human-readable value (e.g., "6 frames per second").
- [ ] Image thumbnails in lists have descriptive alt text.

### Color and Contrast
- [ ] No information conveyed by color alone — always supplement with text, pattern, or icon.
- [ ] Text contrast ratio meets WCAG AA: 4.5:1 for normal text, 3:1 for large text.
- [ ] UI state indicators (selected, active, error) use both color and a non-color cue (border weight, icon, text label).
- [ ] Palette choices tested against deuteranopia and protanopia simulations.

### Motion and Animation
- [ ] Respect `prefers-reduced-motion`: disable auto-playing preview animations, reduce or remove transitions.
- [ ] No flashing content above 3 flashes per second.
- [ ] Animation previews have a visible play/pause control; they do not auto-play on dialog open.

### Text
- [ ] All text scales with browser zoom up to 200% without layout breakage.
- [ ] No text is embedded in images without an accompanying text alternative.
- [ ] Minimum font size: 11px for secondary labels, 12px for body text, 14px for headings.

## Review Checklist
- [ ] Under 200 LOC, or split-reasoned in PR description.
- [ ] Stateful logic in hooks.
- [ ] Perf impact stated (mem / FPS / bundle / cost).
- [ ] No new deps, or trade-off review linked.
- [ ] Accessibility baseline met (see Accessibility Checklist above).
- [ ] Tests + perf gate green (Sprint 2+).
- [ ] Debug logging uses structured logger, not bare console.log.
- [ ] Error states have fallback behavior (placeholder, degraded mode).
- [ ] Debug overlays have zero cost when disabled.
- [ ] Schema changes validated (scene.json / adventure.json).
- [ ] Bundle size delta reported by CI.
- [ ] Visual regression snapshots updated if render output changed.
