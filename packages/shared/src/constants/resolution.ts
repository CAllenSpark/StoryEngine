/** Internal render resolution width in pixels. */
export const INTERNAL_WIDTH = 320;

/** Internal render resolution height in pixels. */
export const INTERNAL_HEIGHT = 180;

/** Tile size in pixels (square tiles). */
export const TILE_SIZE = 16;

/** Tilemap columns at internal resolution. */
export const TILEMAP_COLS = Math.floor(INTERNAL_WIDTH / TILE_SIZE); // 20

/** Tilemap rows at internal resolution. */
export const TILEMAP_ROWS = Math.floor(INTERNAL_HEIGHT / TILE_SIZE); // 11
