/** Bits 0-1: rotation (0-3), Bit 2: flipH, Bit 3: flipV */
export function encodeTransform(rotation: number, flipH: boolean, flipV: boolean): number {
  return (rotation & 0x3) | (flipH ? 0x4 : 0) | (flipV ? 0x8 : 0);
}

export function decodeTransform(value: number): { rotation: number; flipH: boolean; flipV: boolean } {
  return {
    rotation: value & 0x3,
    flipH: !!(value & 0x4),
    flipV: !!(value & 0x8),
  };
}
