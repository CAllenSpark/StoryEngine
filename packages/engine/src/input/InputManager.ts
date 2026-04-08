/**
 * Tracks keyboard state. Zero-allocation in the hot path.
 * Attach to a target element (window or canvas) and poll each frame.
 */
export class InputManager {
  private readonly keys = new Set<string>();
  private readonly justPressed = new Set<string>();
  private readonly target: EventTarget;
  private readonly onKeyDown: (e: Event) => void;
  private readonly onKeyUp: (e: Event) => void;

  constructor(target: EventTarget = window) {
    this.target = target;
    this.onKeyDown = (e: Event) => {
      const key = (e as KeyboardEvent).code;
      if (!this.keys.has(key)) this.justPressed.add(key);
      this.keys.add(key);
    };
    this.onKeyUp = (e: Event) => {
      this.keys.delete((e as KeyboardEvent).code);
    };
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
  }

  /** True while the key is held down. */
  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** True only on the first frame the key is pressed. Call endFrame() each tick. */
  isJustPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  /** Returns a normalized direction vector from WASD/arrow keys. */
  getMovement(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** Call at the end of each update tick to clear just-pressed state. */
  endFrame(): void {
    this.justPressed.clear();
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.keys.clear();
    this.justPressed.clear();
  }
}
