import type { DialogueLine } from '@storyengine/shared';

/** An active blocking media overlay (video/image/slideshow/playerInput). */
export interface MediaOverlay {
  type: 'video' | 'audio' | 'image' | 'slideshow' | 'playerInput';
  url?: string;
  urls?: string[];
  loop?: boolean;
  duration?: number;
  interval?: number;
  prompt?: string;
  options?: string[];
  startedAt: number;
}

/** Snapshot of playtest runtime state exposed to React. */
export interface PlaytestState {
  /** Player position in pixels (world space). */
  px: number;
  py: number;
  /** Player facing direction. */
  facing: 'down' | 'up' | 'left' | 'right';
  /** Currently active scene ID. */
  sceneId: string;
  /** Active dialogue lines, or null if no dialogue. */
  dialogue: DialogueLine[] | null;
  /** Index of the current dialogue line. */
  dialogueIndex: number;
  /** Whether playtest is running. */
  running: boolean;
  /** Set of one-shot action IDs that have fired. */
  firedActions: Set<string>;
  /** Player state flags (from changePlayerState actions). */
  flags: Record<string, unknown>;
  /** Active media overlay (blocks movement). */
  media: MediaOverlay | null;
  /** Active audio (plays in background, doesn't block movement). */
  audio: { url: string; loop: boolean } | null;
  /** Last playerInput choice. */
  lastChoice: string | null;
  /** Adventure has ended — show the resolution card. */
  ended: boolean;
  /** Optional message for the resolution card. */
  endMessage: string | null;
}
