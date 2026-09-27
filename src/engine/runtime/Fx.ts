/**
 * Game feel: particle bursts, floating text, speech bubbles, screen shake, flashes and hit-stop.
 * Shake and flashes follow the player's accessibility settings, and no flash ever hides the
 * bullets (see flashes.ts).
 */
import Phaser from 'phaser';
import { FEEL } from '../../content/balance';
import type { Settings } from '../save/save';
import type { Vec } from '../types';
import { FONT } from '../ui/text';
import { flashAlpha, flashLength, flashPeak, hurtEdgeProfile, hurtFade } from './flashes';

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

/** A full-screen flash in progress. */
interface Flash {
  color: number;
  peak: number;
  ms: number;
  /** Real milliseconds since it started (slow motion doesn't stretch a flash). */
  t: number;
}

/** Past the screen's edge, so a shaking camera never shows a gap. */
const OVERSCAN = 32;
const HURT_EDGE = 'fx-hurt-edge';

interface Bubble {
  box: Phaser.GameObjects.Container;
  follow?: () => Vec | null;
  offsetY: number;
  life: number;
  /** Bubble size, to keep it inside the camera view. */
  w: number;
  h: number;
}

export class Fx {
  private readonly emitters = new Map<BurstStyle, Phaser.GameObjects.Particles.ParticleEmitter>();
  /** Sparks sprayed in a direction: shots connecting, and bouncing off. */
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Where shots connected this frame (impacts right on top of each other merge). */
  private impacts: Vec[] = [];
  private bubbles: Bubble[] = [];
  private hitStopTimer: Phaser.Time.TimerEvent | null = null;
  private flashes: Flash[] = [];
  /** One overlay shows the strongest flash going, so flashes on top of each other don't add up. */
  private flashRect: Phaser.GameObjects.Rectangle | null = null;
  /** Real milliseconds since Morty was last hurt. */
  private hurtT = Infinity;
  private hurtEdge: Phaser.GameObjects.Image | null = null;
  private hurtBorder: Phaser.GameObjects.Graphics | null = null;

  /** `busy` says whether there's something on screen to dodge (enemy shots, hazards). */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly settings: () => Settings,
    private readonly busy: () => boolean = () => false,
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
    this.sparks = scene.add.particles(0, 0, 'fx-spark', {
      lifespan: 200,
      speed: { min: 150, max: 360 },
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 1, end: 0.2 },
      tint: [0xffffff, 0xfff2a8, 0xffd166, 0xffb347],
      emitting: false,
      // Each spark points the way it flies.
      emitCallback: (p: Phaser.GameObjects.Particles.Particle) => {
        p.rotation = Math.atan2(p.velocityY, p.velocityX);
      },
    });
    this.sparks.setDepth(4650);
  }

  /** Particles follow the game's slow motion (a perfect dodge), like everything else. */
  setTimeScale(k: number): void {
    this.emitters.forEach((e) => (e.timeScale = k));
    this.sparks.timeScale = k;
  }

  /**
   * A shot connecting: a white burst at the contact point and sparks sprayed on along the shot,
   * bigger for crits and heavy hits (`power` 1-3). Impacts landing on top of each other in the
   * same frame merge into one, so a volley doesn't turn to mush.
   */
  impact(x: number, y: number, angle: number, power = 1, color = 0xfff2a8): void {
    if (this.merged(x, y)) return;
    this.spray(x, y, angle, power, 38);
    this.pop(x, y, 'fx-star', color, 0.55 * power, 1.5 * power, 90, angle);
  }

  /** A shot bouncing off something it can't hurt (a shield, Scary Terry): sparks glance back off it. */
  deflect(x: number, y: number, angle: number): void {
    if (this.merged(x, y)) return;
    this.spray(x, y, angle + Math.PI, 1, 55);
    this.pop(x, y, 'fx-star', 0xcfefff, 0.5, 1.2, 80, angle);
  }

  private merged(x: number, y: number): boolean {
    if (this.impacts.some((p) => Math.hypot(p.x - x, p.y - y) < FEEL.hits.mergeRadius)) return true;
    this.impacts.push({ x, y });
    return false;
  }

  private spray(x: number, y: number, angle: number, power: number, spreadDeg: number): void {
    const deg = Phaser.Math.RadToDeg(angle);
    const e = this.sparks;
    const k = 0.8 + 0.2 * power;
    // Point this burst (the emitter's ops take a fresh range each time; no rebuild).
    e.ops.angle.loadConfig({ angle: { min: deg - spreadDeg, max: deg + spreadDeg } });
    e.ops.speedX.loadConfig({ speed: { min: 140 * k, max: 340 * k } }, 'speed');
    e.explode(Math.round(FEEL.hits.sparks * (0.6 + 0.4 * power)), x, y);
  }

  burst(style: BurstStyle, x: number, y: number, count?: number): void {
    this.emitters.get(style)?.explode(count ?? STYLES[style].count, x, y);
  }

  /** A quick additive flash that grows and fades: muzzle flashes, impacts, perfect dodges. */
  pop(x: number, y: number, texture: string, color: number, from: number, to: number, ms: number, angle = 0): void {
    const img = this.scene.add.image(x, y, texture).setDepth(4600).setBlendMode(Phaser.BlendModes.ADD).setTint(color).setScale(from).setRotation(angle);
    this.scene.tweens.add({ targets: img, scale: to, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
  }

  /** Dust kicked up at someone's feet (drawn behind them, not glowing). */
  dust(x: number, y: number, size: number, color: number): void {
    const img = this.scene.add.image(x, y, 'fx-puff').setDepth(y - 14).setTint(color).setAlpha(0.75).setScale(0.35 * size);
    this.scene.tweens.add({ targets: img, scale: 0.95 * size, alpha: 0, y: y - 7, duration: 340, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
  }

  /** An expanding ring: impacts, kills, spawn warnings. */
  ring(x: number, y: number, color: number, radius: number, ms: number, width = 3): void {
    const c = this.scene.add.circle(x, y, radius, color, 0).setStrokeStyle(width, color, 0.9).setDepth(4600).setScale(0.25);
    this.scene.tweens.add({ targets: c, scale: 1, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => c.destroy() });
  }

  /** A jagged lightning bolt between two points (chain lightning). */
  zap(from: Vec, to: Vec, color = 0x9fe8ff): void {
    const g = this.scene.add.graphics().setDepth(4650).setBlendMode(Phaser.BlendModes.ADD);
    const segs = 6;
    const nx = -(to.y - from.y);
    const ny = to.x - from.x;
    const len = Math.hypot(nx, ny) || 1;
    const pts: Vec[] = [from];
    for (let i = 1; i < segs; i++) {
      const k = i / segs;
      // Deterministic zig-zag, so the look never touches the gameplay RNG.
      const off = (i % 2 ? 1 : -1) * (6 + ((i * 7) % 5) * 2);
      pts.push({ x: from.x + (to.x - from.x) * k + (nx / len) * off, y: from.y + (to.y - from.y) * k + (ny / len) * off });
    }
    pts.push(to);
    for (const [w, a] of [[7, 0.35], [2.5, 1]] as const) {
      g.lineStyle(w, w > 3 ? color : 0xffffff, a);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      g.strokePath();
    }
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  /** A quick blade swipe. */
  slash(x: number, y: number, angle: number, color = 0xffffff): void {
    this.pop(x, y, 'fx-slash', color, 0.8, 1.5, 200, angle);
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
    const bubble: Bubble = { box, follow, offsetY: 0, life: seconds, w, h: h + (name ? 22 : 12) };
    this.bubbles.push(bubble);
    this.placeBubble(bubble, at);
  }

  /** Puts a bubble over its speaker, nudged inside the camera view when they're near an edge. */
  private placeBubble(b: Bubble, at: Vec): void {
    const view = this.scene.cameras.main.worldView;
    const margin = 6;
    const x = Phaser.Math.Clamp(at.x, view.x + b.w / 2 + margin, Math.max(view.x + b.w / 2 + margin, view.right - b.w / 2 - margin));
    const y = Math.max(at.y, view.y + b.h + margin);
    b.box.setPosition(x, y);
  }

  update(dt: number): void {
    this.impacts.length = 0;
    // Flashes run on real time: slow motion never draws one out over the action.
    const real = Math.min(100, this.scene.game.loop.delta);
    for (const f of this.flashes) f.t += real;
    this.flashes = this.flashes.filter((f) => f.t < f.ms);
    this.drawFlash();
    if (this.hurtT < Infinity) {
      this.hurtT += real;
      this.drawHurt();
    }
    for (const b of this.bubbles) {
      b.life -= dt;
      const p = b.follow?.();
      if (p) this.placeBubble(b, p);
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

  /**
   * A full-screen flash of color that fades out over `ms`. It's never solid: at most
   * FEEL.flash.maxAlpha, and no more than FEEL.flash.busyAlpha while there's anything to dodge on
   * screen; with Reduced flashes, a faint tint.
   */
  flash(color: number, ms: number): void {
    const reduced = this.settings().reducedFlash;
    this.flashes.push({ color, peak: flashPeak(reduced), ms: flashLength(ms, reduced), t: 0 });
    this.drawFlash();
  }

  private drawFlash(): void {
    let best: Flash | null = null;
    let alpha = 0;
    const busy = this.flashes.length > 0 && this.busy();
    for (const f of this.flashes) {
      const a = flashAlpha(f.peak, f.ms, f.t, busy);
      if (a > alpha) {
        alpha = a;
        best = f;
      }
    }
    if (!best) {
      this.flashRect?.setVisible(false);
      return;
    }
    const cam = this.scene.cameras.main;
    // Sized past the view, so a shaking or tilting camera never shows its edge.
    this.flashRect ??= this.scene.add
      .rectangle(cam.width / 2, cam.height / 2, cam.width * 1.5, cam.height * 1.5, 0xffffff)
      .setScrollFactor(0)
      .setDepth(7000);
    this.flashRect.setFillStyle(best.color, alpha).setVisible(true);
  }

  /**
   * Morty got hurt: a red glow around the very edge of the screen, gone in FEEL.hurt.edgeMs, with
   * the middle, where the bullets are, left clear. With Reduced flashes, a thin red border.
   */
  hurt(): void {
    this.hurtT = 0;
    this.drawHurt();
  }

  private drawHurt(): void {
    const H = FEEL.hurt;
    const reduced = this.settings().reducedFlash;
    const k = hurtFade(this.hurtT, reduced);
    const cam = this.scene.cameras.main;
    if (k <= 0) this.hurtT = Infinity;
    if (reduced) {
      this.hurtEdge?.setVisible(false);
      this.hurtBorder ??= this.scene.add.graphics().setScrollFactor(0).setDepth(7001);
      const g = this.hurtBorder.clear();
      if (k > 0) {
        g.lineStyle(H.borderPx, H.color, k);
        g.strokeRect(H.borderPx / 2, H.borderPx / 2, cam.width - H.borderPx, cam.height - H.borderPx);
      }
      return;
    }
    this.hurtBorder?.clear();
    this.hurtEdge ??= this.scene.add.image(cam.width / 2, cam.height / 2, this.hurtEdgeTexture(cam.width, cam.height)).setScrollFactor(0).setDepth(7001);
    this.hurtEdge.setVisible(k > 0).setAlpha(k);
  }

  /** The hurt glow, drawn once: red along each edge of the view, fading to nothing inside its band. */
  private hurtEdgeTexture(w: number, h: number): string {
    const textures = this.scene.textures;
    if (textures.exists(HURT_EDGE)) return HURT_EDGE;
    const H = FEEL.hurt;
    const W = w + OVERSCAN * 2;
    const Ht = h + OVERSCAN * 2;
    const tex = textures.createCanvas(HURT_EDGE, W, Ht);
    if (!tex) return HURT_EDGE;
    const ctx = tex.getContext();
    const band = H.edgeBand * h;
    const rgb = `${(H.color >> 16) & 0xff},${(H.color >> 8) & 0xff},${H.color & 0xff}`;
    // One gradient per edge, from the screen's edge inward; past the edge it keeps full strength.
    const edges: [number, number, number, number, number, number, number, number][] = [
      [0, 0, W, OVERSCAN + band, 0, OVERSCAN, 0, OVERSCAN + band],
      [0, Ht - OVERSCAN - band, W, OVERSCAN + band, 0, Ht - OVERSCAN, 0, Ht - OVERSCAN - band],
      [0, 0, OVERSCAN + band, Ht, OVERSCAN, 0, OVERSCAN + band, 0],
      [W - OVERSCAN - band, 0, OVERSCAN + band, Ht, W - OVERSCAN, 0, W - OVERSCAN - band, 0],
    ];
    for (const [x, y, rw, rh, x0, y0, x1, y1] of edges) {
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      for (let i = 0; i <= 10; i++) grad.addColorStop(i / 10, `rgba(${rgb},${hurtEdgeProfile((i / 10) * band, h).toFixed(3)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, rw, rh);
    }
    tex.refresh();
    return HURT_EDGE;
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
    this.flashRect?.destroy();
    this.hurtEdge?.destroy();
    this.hurtBorder?.destroy();
    this.emitters.forEach((e) => e.destroy());
    this.emitters.clear();
    this.sparks.destroy();
  }
}
