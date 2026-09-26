/**
 * Turns code-drawn art into textures at boot. Every SpriteArt is drawn once into a Graphics
 * object and baked, with a little padding so thick outlines don't get clipped.
 */
import type Phaser from 'phaser';
import type { IconDraw, SpriteArt } from '../types';

export const TEXTURE_PAD = 4;
export const ICON_SIZE = 32;

export function bakeArt(scene: Phaser.Scene, art: SpriteArt): void {
  if (scene.textures.exists(art.key)) scene.textures.remove(art.key);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.translateCanvas(TEXTURE_PAD, TEXTURE_PAD);
  art.draw(g, art.width, art.height);
  g.generateTexture(art.key, Math.ceil(art.width + TEXTURE_PAD * 2), Math.ceil(art.height + TEXTURE_PAD * 2));
  g.destroy();
}

/** Icons are drawn in a 32x32 box centered at (16,16). */
export function bakeIcon(scene: Phaser.Scene, key: string, draw: IconDraw): void {
  bakeArt(scene, { key, width: ICON_SIZE, height: ICON_SIZE, draw: (g) => draw(g) });
}
