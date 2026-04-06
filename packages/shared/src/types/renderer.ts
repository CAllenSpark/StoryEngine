export interface RendererStats {
  fps: number;
  frameTimeMs: number;
  frameTimeP95Ms: number;
  drawCalls: number;
  spriteCount: number;
  memoryMb: number;
}

export interface RendererConfig {
  width: number;
  height: number;
  backgroundColor?: number;
}
