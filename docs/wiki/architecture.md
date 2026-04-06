# Architecture

> Sprint 1 seed. Owner: Frontend Engineer + Backend Engineer.

## Components
- **Tile Creator Studio** — authoring tool for environment tiles and tilemaps. Produces `scene.json`.
- **Game Design Studio** — creative authoring environment for cards/locations, actors, dialogue, triggers, beats, inventory, and multi-path narrative. WYSIWYG preview via embedded runtime. Produces `adventure.json`. Code export for publishing optimized bundles.
- **Engine Runtime** — in-browser player. Reads `adventure.json`, streams assets, renders, plays audio, handles input.
- **Player Shell** — the player-facing library and session frame (web first, mobile wrapper later).
- **Backend Services** — static CDN for content, serverless functions for save/sync and telemetry.

## Data Flow
```
Authoring (Studios + WYSIWYG Preview)
        │
        ▼
scene.json / adventure.json
        │
        ▼
Code Export / Bundler  (validate → tree-shake → pack → emit)
        │
        ▼
Adventure Bundle (CDN, content-hashed)
        │
        ▼
Engine Runtime (browser) + Debug Overlay
        │
        ▼
Telemetry (serverless, minimal)
```

## Principles
- **Offline-first** runtime. Sync is an optional convenience.
- **Content is data.** The engine ships once; adventures ship often.
- **Studios are WYSIWYG creative environments, not code editors.** Authors think in cards, beats, and dialogue — not coordinates and code.
- **Separation of authoring and runtime** — but studios embed a sandboxed runtime instance for preview. Same rendering pipeline, isolated execution.
- **One binary, many adventures.** Engine is reused across every title.

## WYSIWYG Preview Architecture
- Studios embed Engine Runtime in a **sandboxed iframe**.
- Communication via `postMessage`: studio pushes scene/adventure data, preview renders.
- Same rendering pipeline as production — no fork, no separate preview renderer.
- Hot-reload via delta updates on every authoring change.

## Code Export Pipeline
- **Validate:** schema checks on scene.json / adventure.json.
- **Tree-shake:** remove unused assets, unreachable beats, orphaned branches.
- **Compile:** dialogue graphs → optimized lookup tables; inventory gates → fast state checks.
- **Pack:** atlas packing, multi-bitrate audio, WebP compression.
- **Emit:** self-contained bundle with manifest + content-hashed assets.
- **Budget check:** export fails if perf budget exceeded, with a report of what's over.

## Asset Pipeline
- Automated atlas packing at build time (TexturePacker CLI or custom).
- WebP + PNG fallback compression.
- Audio: 128 kbps desktop / 64 kbps mobile with runtime fallback.
- Content-hash filenames for CDN cache-busting.
- Platform-specific build flags (`--target=mobile` → lower-res textures, reduced audio).
- Pre-commit hooks reject oversized assets.

## Deployment Topology
- **PWA baseline:** service worker for offline play, web app manifest, HTTPS.
- **CDN:** content-hashed adventure bundles. Service worker pre-caches current adventure.
- **Save:** IndexedDB via localForage (offline-first). Optional sync (last-write-wins V1).
- **Security:** CSP headers, input sanitization, bundle integrity hash.

## To Define in Sprint 2
- Rendering stack (Pixi / Phaser / Canvas2D / WebGPU).
- Backend provider (Cloudflare / Vercel / other).
- Bundle format and manifest schema.
- Mobile wrapper approach.
