const DEBUG = typeof localStorage !== 'undefined'
  ? (import.meta.env?.DEV || localStorage.getItem('SE_DEBUG') === '1')
  : true;

export const logger = {
  info(msg: string, data?: Record<string, unknown>) {
    if (DEBUG) globalThis.console.info(`[TileCreator] ${msg}`, data ?? '');
  },
  warn(msg: string, data?: Record<string, unknown>) {
    globalThis.console.warn(`[TileCreator] ${msg}`, data ?? '');
  },
  error(msg: string, data?: Record<string, unknown>) {
    globalThis.console.error(`[TileCreator] ${msg}`, data ?? '');
  },
};
