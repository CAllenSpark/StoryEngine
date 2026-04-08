// Core
export { GameLoop } from './core/GameLoop.js';
export type { GameLoopCallbacks } from './core/GameLoop.js';
export { Clock } from './core/Clock.js';

// Renderer
export type { IRenderer } from './renderer/IRenderer.js';
export { PixiRenderer } from './renderer/PixiRenderer.js';
export { Canvas2DRenderer } from './renderer/Canvas2DRenderer.js';
export { RendererStats } from './renderer/RendererStats.js';

// Scene
export { Tilemap } from './scene/Tilemap.js';
export { loadTilemap } from './scene/TilemapLoader.js';

// Actor
export { Actor } from './actor/Actor.js';
export type { ActorType, Facing } from './actor/Actor.js';
export { ActorPool } from './actor/ActorPool.js';
export { ActorSystem } from './actor/ActorSystem.js';

// Input
export { InputManager } from './input/InputManager.js';

// Debug
export { parseDebugFlags } from './debug/DebugFlags.js';
export type { DebugFlagState } from './debug/DebugFlags.js';
export { PerfOverlay } from './debug/PerfOverlay.js';
