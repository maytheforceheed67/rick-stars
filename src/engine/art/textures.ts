/**
 * Turns code-drawn art into textures at boot. Every SpriteArt is drawn once into a Graphics
 * object and baked, with a little padding so thick outlines don't get clipped.
 */
import type Phaser from 'phaser';
import type { IconDraw, SpriteArt, SpritePose } from '../types';

export const TEXTURE_PAD = 4;
export const ICON_SIZE = 32;

const STRIDES = [-1, 0, 1] as const;
const ARMS = [-1, 0, 1] as const;
/** Just walking: both arms are always drawn. */
const BOTH_ARMS = [0] as const;

/** The texture for a posed sprite in one pose; standing with both arms down is the plain key. */
export function poseKey(key: string, stride: number, freeArm: number): string {
  return stride === 0 && freeArm === 0 ? key : `${key}~s${stride}a${freeArm}`;
}

function bakeOne(scene: Phaser.Scene, art: SpriteArt, key: string, pose?: SpritePose): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.translateCanvas(TEXTURE_PAD, TEXTURE_PAD);
  art.draw(g, art.width, art.height, pose);
  g.generateTexture(key, Math.ceil(art.width + TEXTURE_PAD * 2), Math.ceil(art.height + TEXTURE_PAD * 2));
  g.destroy();
}

/** Bakes a sprite, and with `poses` its walk-cycle (and weapon-holding) frames too. */
export function bakeArt(scene: Phaser.Scene, art: SpriteArt): void {
  bakeOne(scene, art, art.key);
  if (!art.poses) return;
  for (const stride of STRIDES) {
    for (const freeArm of art.poses === 'walk' ? BOTH_ARMS : ARMS) {
      if (stride || freeArm) bakeOne(scene, art, poseKey(art.key, stride, freeArm), { stride, freeArm });
    }
  }
}

/** Icons are drawn in a 32x32 box centered at (16,16). */
export function bakeIcon(scene: Phaser.Scene, key: string, draw: IconDraw): void {
  bakeArt(scene, { key, width: ICON_SIZE, height: ICON_SIZE, draw: (g) => draw(g) });
}
