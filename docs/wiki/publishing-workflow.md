# Publishing Workflow

> Sprint 1.5 seed. Owner: Backend Engineer + PM. See also: [TDD](../tdd.md), [performance-budget](performance-budget.md).

## Pipeline Overview

```
Author in Studio → WYSIWYG Preview → Content Approval → Code Export → Upload to CDN → Library Manifest Update
```

Each step is a gate. Failure at any step blocks progression with clear error messages.

## Content Approval Checklist

Before code export, the adventure must pass these checks (enforced in the Game Design Studio UI):

- [ ] **Session timer validation:** adventure plays in 4–6 minutes (automated timing via debug playthrough).
- [ ] **Dialogue line limits:** no bubble exceeds 3 lines of text.
- [ ] **Beat timing:** no single beat takes more than 60 seconds.
- [ ] **Condition validation:** all conditions reference valid world state fields.
- [ ] **Asset completeness:** all referenced sprites, tiles, and audio exist and are within size budgets.
- [ ] **World state actions:** all inventory additions, flag changes, and location discoveries are valid.
- [ ] **Design Leader sign-off:** manual approval required before export. Confirms tone, pacing, and pillar alignment.

## Code Export

See [TDD §"Code Export Pipeline"](../tdd.md) for technical details.

Export produces a **self-contained adventure bundle** with:
- Compiled adventure data (optimized from `adventure.json`)
- Packed texture atlases
- Multi-bitrate audio
- Manifest with content-hashed filenames
- `minEngineVersion` declaration
- `starterState.json` (for mid-series players)
- Bundle size validated against perf budget

## Publish API

### POST /publish

**Input:** Adventure bundle (validated, exported).

**Steps:**
1. Server-side validation (bundle integrity hash, size check, manifest schema check).
2. Upload assets to CDN with content-hash filenames.
3. Update the **library manifest** (add new episode entry or update existing version).
4. Invalidate CDN cache for the manifest endpoint.
5. Return: public URL, manifest entry, version number.

**Auth:** PM or Design Leader credentials required. No auto-publish without human approval.

### GET /library

**Returns:** Library manifest — the list of all published episodes with metadata.

```json
{
  "schemaVersion": 1,
  "episodes": [
    {
      "id": "episode-1",
      "version": "1.0.0",
      "title": "The Compass",
      "synopsis": "Jack finds a compass that points somewhere impossible.",
      "coverUrl": "https://cdn.example.com/covers/ep1-abc123.webp",
      "bundleUrl": "https://cdn.example.com/bundles/ep1-v1.0.0-def456.zip",
      "duration": "5m",
      "series": 1,
      "episodeNumber": 1,
      "releaseDate": "2026-04-01",
      "minEngineVersion": "1.0.0",
      "isFree": true,
      "bundleSize": 1843200
    }
  ]
}
```

**Player Shell** fetches the manifest once per session (cached via service worker). New episodes appear automatically.

## Versioning

Adventures are **immutable once published.** Changes require a new version.

| Change Type | Version Bump | Example |
|---|---|---|
| Typo fix, minor text edit | Patch (1.0.0 → 1.0.1) | Fix "teh" → "the" |
| New dialogue branch, beat reorder | Minor (1.0.0 → 1.1.0) | Add alternate ending |
| New cards, story restructuring | Major (1.0.0 → 2.0.0) | Rewrite act 2 |

**Player behavior:**
- **Patch:** auto-applied on next play. Save state compatible.
- **Minor:** player prompted to update. Save state compatible.
- **Major:** player prompted; save state may require reset (communicate clearly in the prompt).

## Rollback

PM can:
- **Unpublish** an episode (remove from manifest; players who downloaded it can still play offline, but it won't appear in the library for new players).
- **Revert** to a previous version (update manifest to point at the older bundle URL).
- **Hot-fix:** publish a patch version. Target SLA: typo/text fix deployable in < 1 hour.

## Engine Compatibility

Each adventure declares `minEngineVersion` in its manifest.

- On load, runtime checks: `engineVersion >= adventure.minEngineVersion`.
- If incompatible: prompt player to update the engine (for PWA: service worker fetches new engine; for app store: link to update).
- CI validates: new adventures are tested against the minimum supported engine version before publish.

## Shared Assets

Recurring characters, locations, and UI elements live in a **shared-assets bundle** separate from per-episode bundles:

- `shared-assets-v1.0.0-hash.zip` contains: protagonist sprites, recurring NPC sprites, common UI elements, shared audio stings.
- Episodes reference shared assets by ID (not by embedding them).
- Shared assets have their own version + cache lifecycle.
- When a shared asset is updated (e.g., protagonist sprite fix), a new shared-assets version is published. Old episodes continue to reference the old version; new episodes reference the new version. Players who update get the fix for all episodes.

## Deployment Cadence

**Target:** One new episode per week during active development.

**Workflow per episode:**
1. **Mon–Wed:** Author in Game Design Studio. WYSIWYG preview iterations.
2. **Thu:** Content approval checklist. Design Leader sign-off.
3. **Fri:** Code export → publish to CDN → verify in Player Shell.
4. **Ongoing:** Monitor telemetry (see [telemetry.md](telemetry.md)). Hot-fix if needed.

This cadence is aspirational. Actual velocity depends on team size and story complexity.
