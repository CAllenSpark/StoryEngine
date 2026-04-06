import type { SceneJSON } from './scene.js';

export interface PreviewMessage {
  type: 'scene-update';
  scene: SceneJSON;
  tilesetImageDataUrl: string | null;
}
