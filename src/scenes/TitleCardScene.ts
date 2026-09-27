/**
 * The episode title card that opens every run: the episode number and title burst out of a
 * portal for a couple of seconds. Any key or a click skips it.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/constants';
import { displayStyle, textStyle } from '../engine/ui/text';

export interface TitleCardData {
  season: number;
  number: number;
  title: string;
  onDone: () => void;
}

export class TitleCardScene extends Phaser.Scene {
  private data0!: TitleCardData;
  private closing = false;

  constructor() {
    super('TitleCard');
  }

  init(data: TitleCardData): void {
    this.data0 = data;
    this.closing = false;
  }

  create(): void {
    const { season, number, title } = this.data0;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const bg = this.add.graphics();
    bg.fillStyle(0x07060d, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Stars, placed by a fixed pattern (no RNG needed for decoration).
    for (let i = 0; i < 90; i++) {
      bg.fillStyle(0xffffff, 0.25 + ((i * 29) % 10) / 16);
      bg.fillCircle((i * 263) % GAME_WIDTH, (i * 131) % GAME_HEIGHT, 1 + (i % 3) * 0.6);
    }
    const portal = this.add.image(cx, cy, 'exit-portal').setScale(0.2).setAlpha(0.95);
    this.tweens.add({ targets: portal, scale: 5.2, angle: 160, duration: 900, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: portal, angle: '+=360', duration: 9000, repeat: -1 });
    const label = `SEASON ${season}  ·  EPISODE ${number}`;
    const top = this.add.text(cx, cy - 64, label, textStyle(22, '#f4efe6', { stroke: '#07060d', strokeThickness: 6 })).setOrigin(0.5).setAlpha(0);
    const name = this.add.text(cx, cy + 6, title, displayStyle(86, '#ffffff', { strokeThickness: 14 })).setOrigin(0.5).setScale(2.4).setAlpha(0);
    this.tweens.add({ targets: top, alpha: 1, duration: 300, delay: 350 });
    this.tweens.add({ targets: name, alpha: 1, scale: 1, duration: 420, delay: 420, ease: 'Back.easeOut' });
    this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 16, 'Any key: skip', textStyle(13, '#6d6480')).setOrigin(1, 1);
    this.cameras.main.fadeIn(200);
    this.time.delayedCall(2600, () => this.close());
    this.input.keyboard?.on('keydown', () => this.close());
    this.input.on('pointerdown', () => this.close());
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(240, () => {
      const done = this.data0.onDone;
      this.scene.stop();
      done();
    });
  }
}
