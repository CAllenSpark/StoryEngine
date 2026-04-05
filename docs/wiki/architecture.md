# Architecture

> Sprint 1 seed. Owner: Frontend Engineer + Backend Engineer.

## Components
- **Tile Creator Studio** — authoring tool for environment tiles and tilemaps. Produces `scene.json`.
- **Game Design Studio** — authoring tool for actors, dialogue, triggers, beats. Produces `adventure.json`.
- **Engine Runtime** — in-browser player. Reads `adventure.json`, streams assets, renders, plays audio, handles input.
- **Player Shell** — the player-facing library and session frame (web first, mobile wrapper later).
- **Backend Services** — static CDN for content, serverless functions for save/sync and telemetry.

## Data Flow
```
Authoring (Studios) ──► scene.json / adventure.json ──► Bundler
                                                          │
                                                          ▼
                                          Adventure Bundle (CDN)
                                                          │
                                                          ▼
                                          Engine Runtime (browser)
                                                          │
                                                          ▼
                                              Telemetry (serverless)
```

## Principles
- **Offline-first** runtime. Sync is an optional convenience.
- **Content is data.** The engine ships once; adventures ship often.
- **Separation of authoring and runtime.** Studios never embed runtime code.
- **One binary, many adventures.** Engine is reused across every title.

## To Define in Sprint 2
- Rendering stack (Pixi / Phaser / Canvas2D / WebGPU).
- Backend provider (Cloudflare / Vercel / other).
- Bundle format and manifest schema.
- Mobile wrapper approach.
