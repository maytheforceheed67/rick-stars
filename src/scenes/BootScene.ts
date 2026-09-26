/** Bakes every code-drawn texture, then shows the title screen. */
import Phaser from 'phaser';
import { ENGINE_SPRITES } from '../engine/art/engineSprites';
import { bakeArt, bakeIcon } from '../engine/art/textures';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/constants';
import { svc } from '../engine/services';
import { displayStyle } from '../engine/ui/text';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Warming up the portal gun...', displayStyle(30, '#97ce4c')).setOrigin(0.5);
    // Let the loading text render before the (synchronous) baking starts.
    this.time.delayedCall(30, () => {
      bakeAllTextures(this);
      this.scene.start('Title');
    });
  }
}

export function bakeAllTextures(scene: Phaser.Scene): void {
  const reg = svc().registry;
  for (const art of ENGINE_SPRITES) bakeArt(scene, art);
  for (const art of reg.sprites.values()) bakeArt(scene, art);
  for (const item of reg.items.values()) bakeIcon(scene, `icon-${item.id}`, item.icon);
  for (const s of reg.statuses.values()) bakeIcon(scene, `status-${s.id}`, s.icon);
  // Cosmetic shirts for every character that supports recoloring.
  for (const ch of reg.characters.values()) {
    if (!ch.recolor || !ch.sprite) continue;
    for (const u of reg.upgrades.values()) {
      if (u.shirt !== undefined) bakeArt(scene, ch.recolor(u.shirt, `${ch.sprite.key}-${u.id}`));
    }
  }
}
