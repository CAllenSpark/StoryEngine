export interface DebugFlagState {
  perf: boolean;
  overlay: boolean;
  renderer: 'pixi' | 'canvas2d';
}

/** Parse debug flags from URL params and localStorage. */
export function parseDebugFlags(): DebugFlagState {
  const params = new URLSearchParams(window.location.search);
  const debugParam = params.get('debug') ?? '';
  const flags = debugParam.split(',').map((s) => s.trim().toLowerCase());
  const stored = localStorage.getItem('SE_DEBUG') === '1';

  const perf = flags.includes('perf') || flags.includes('true') || stored;
  const overlay = flags.includes('overlay') || flags.includes('true') || stored;
  const rendererParam = params.get('renderer')?.toLowerCase();
  const renderer = rendererParam === 'canvas2d' ? 'canvas2d' : 'pixi';

  return { perf, overlay, renderer };
}
