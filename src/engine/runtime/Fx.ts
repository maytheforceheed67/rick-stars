/**
 * Game feel: particle bursts, floating text, speech bubbles, screen shake, flashes and hit-stop.
 * Shake and flashes follow the player's accessibility settings.
 */
import Phaser from 'phaser';
import type { Settings } from '../save/save';
import type { Vec } from '../types';
import { FONT } from '../ui/text';

export type BurstStyle = 'hit' | 'death' | 'ice' | 'scrap' | 'slime' | 'paper' | 'portal' | 'smoke' | 'spark' | 'heal' | 'fire' | 'confetti';

interface BurstConfig {
  texture: string;
  tint: number[];
  speed: [number, number];
  life: number;
  scale: [number, number];
  gravity?: number;
  count: number;
  blend?: boolean;
}

const STYLES: Record<BurstStyle, BurstConfig> = {
  hit: { texture: 'fx-dot', tint: [0xffffff, 0xfff2a8], speed: [60, 180], life: 220, scale: [0.9, 0], count: 5 },
  death: { texture: 'fx-puff', tint: [0xf4efe6, 0xd8d2e6, 0xbdb6cc], speed: [40, 160], life: 480, scale: [1.1, 0.2], count: 10 },
  ice: { texture: 'fx-shard', tint: [0xbfeaff, 0x8fd3ff, 0xffffff], speed: [120, 340], life: 520, scale: [1.2, 0.3], count: 14, gravity: 240 },
  scrap: { texture: 'fx-star', tint: [0xffe27a, 0xffc93c], speed: [40, 120], life: 400, scale: [0.9, 0], count: 6, blend: true },
  slime: { texture: 'fx-dot', tint: [0x9bd35a, 0x6fa83a, 0xb6e27a], speed: [60, 200], life: 420, scale: [1.3, 0.3], count: 10, gravity: 300 },
  paper: { texture: 'fx-square', tint: [0xffffff, 0xf2f2e6], speed: [60, 220], life: 600, scale: [1, 0.4], count: 10, gravity: 160 },
  portal: { texture: 'fx-dot', tint: [0x97ce4c, 0xc9f59a, 0x4f8a1f], speed: [30, 200], life: 600, scale: [1.2, 0], count: 18, blend: true },
  smoke: { texture: 'fx-puff', tint: [0x8a8699, 0x6d6a7c], speed: [20, 80], life: 700, scale: [1.3, 2.2], count: 8 },
  spark: { texture: 'fx-dot', tint: [0xfff2a8, 0xffa94d], speed: [120, 320], life: 260, scale: [0.8, 0], count: 10, blend: true },
  heal: { texture: 'fx-star', tint: [0xff8fa3, 0xffd1dc], speed: [30, 90], life: 600, scale: [1, 0], count: 8, gravity: -80, blend: true },
  fire: { texture: 'fx-puff', tint: [0xffd166, 0xff8a3d, 0xff4a3d], speed: [60, 260], life: 520, scale: [1.6, 0.2], count: 22, blend: true },
  confetti: { texture: 'fx-square', tint: [0x97ce4c, 0xf7d747, 0xf08fb0, 0x8ec5de, 0xff8a3d], speed: [120, 380], life: 1300, scale: [1, 0.6], count: 40, gravity: 260 },
};

interface Bubble {
  box: Phaser.GameObjects.Container;
  follow?: () => Vec | null;
  offsetY: number;
  life: number;
}

export class Fx {
  private readonly emitters = new Map<BurstStyle, Phaser.GameObjects.Particles.ParticleEmitter>();
  private bubbles: Bubble[] = [];
  private hitStopTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly settings: () => Settings,
  ) {
    for (const [style, c] of Object.entries(STYLES) as [BurstStyle, BurstConfig][]) {
      const e = scene.add.particles(0, 0, c.texture, {
        lifespan: c.life,
        speed: { min: c.speed[0], max: c.speed[1] },
        scale: { start: c.scale[0], end: c.scale[1] },
        alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 },
        tint: c.tint,
        gravityY: c.gravity ?? 0,
        blendMode: c.blend ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
        emitting: false,
      });
      e.setDepth(4500);
      this.emitters.set(style, e);
    }
  }

  burst(style: BurstStyle, x: number, y: number, count?: number): void {
    this.emitters.get(style)?.explode(count ?? STYLES[style].count, x, y);
  }

  floatText(x: number, y: number, text: string, color = '#ffffff', size = 20): void {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#1a1424', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(5500);
    this.scene.tweens.add({ targets: t, y: y - 42, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /** Speech bubble that follows a target (or stays put) for a few seconds. */
  bubble(at: Vec, text: string, color: number, seconds = 2.6, follow?: () => Vec | null, name?: string): void {
    const pad = 10;
    const label = this.scene.add.text(0, 0, text, {
      fontFamily: FONT,
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#1a1424',
      wordWrap: { width: 250 },
      align: 'center',
    });
    label.setOrigin(0.5, 1);
    const w = Math.max(60, label.width + pad * 2);
    const h = label.height + pad * 2;
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-w / 2, -h - 12, w, h, 12);
    g.fillTriangle(-8, -13, 8, -13, 0, 0);
    g.lineStyle(3, 0x1a1424, 1);
    g.strokeRoundedRect(-w / 2, -h - 12, w, h, 12);
    g.fillStyle(color, 1);
    g.fillRect(-w / 2 + 10, -h - 12, w - 20, 5);
    label.setPosition(0, -12 - pad);
    const parts: Phaser.GameObjects.GameObject[] = [g, label];
    if (name) {
      const tag = this.scene.add
        .text(-w / 2 + 8, -h - 22, name, { fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#ffffff', stroke: '#1a1424', strokeThickness: 4 })
        .setOrigin(0, 0.5);
      parts.push(tag);
    }
    const box = this.scene.add.container(at.x, at.y, parts).setDepth(6000);
    box.setScale(0.6);
    this.scene.tweens.add({ targets: box, scale: 1, duration: 140, ease: 'Back.easeOut' });
    // Only one bubble per follow target at a time.
    if (follow) this.bubbles = this.bubbles.filter((b) => (b.follow === follow ? (b.box.destroy(), false) : true));
    this.bubbles.push({ box, follow, offsetY: 0, life: seconds });
  }

  update(dt: number): void {
    for (const b of this.bubbles) {
      b.life -= dt;
      const p = b.follow?.();
      if (p) b.box.setPosition(p.x, p.y);
      if (b.life < 0.25) b.box.setAlpha(Math.max(0, b.life / 0.25));
    }
    this.bubbles = this.bubbles.filter((b) => {
      if (b.life > 0) return true;
      b.box.destroy();
      return false;
    });
  }

  shake(intensity: number, ms: number): void {
    if (!this.settings().screenShake) return;
    this.scene.cameras.main.shake(ms, intensity / 1000);
  }

  flash(color: number, ms: number): void {
    const cam = this.scene.cameras.main;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    if (this.settings().reducedFlash) {
      // A gentle tint instead of a full-screen flash.
      const overlay = this.scene.add.rectangle(cam.scrollX + cam.width / 2, cam.scrollY + cam.height / 2, cam.width * 2, cam.height * 2, color, 0.12).setDepth(7000);
      this.scene.tweens.add({ targets: overlay, alpha: 0, duration: ms * 2, onComplete: () => overlay.destroy() });
      return;
    }
    cam.flash(ms, r, g, b, true);
  }

  /** Freezes the action for a moment on big hits (the run scene skips its update meanwhile). */
  hitStop(ms: number): void {
    const world = (this.scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics }).physics.world;
    if (!world || this.stopped) return;
    this.stopped = true;
    world.pause();
    this.hitStopTimer?.remove();
    this.hitStopTimer = this.scene.time.delayedCall(ms, () => {
      this.stopped = false;
      world.resume();
    });
  }

  /** True during a hit-stop. */
  stopped = false;

  clearBubbles(): void {
    this.bubbles.forEach((b) => b.box.destroy());
    this.bubbles = [];
  }

  destroy(): void {
    this.clearBubbles();
    this.emitters.forEach((e) => e.destroy());
    this.emitters.clear();
  }
}
