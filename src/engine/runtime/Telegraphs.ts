/**
 * Attack warnings and area hazards. Telegraphs use shape and motion (a fill that grows toward
 * the edge, pulsing outlines and hatching), not just color, so they read for everyone.
 */
import Phaser from 'phaser';
import type { HazardSpec, TelegraphSpec, Vec } from '../types';

const DANGER = 0xff4a3d;

interface TelegraphItem {
  spec: TelegraphSpec | (() => TelegraphSpec);
  progress: number;
  alive: () => boolean;
  dead: boolean;
}

export interface TelegraphHandle {
  setProgress(p: number): void;
  destroy(): void;
}

export class TelegraphLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private items: TelegraphItem[] = [];

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(-500);
  }

  add(spec: TelegraphSpec | (() => TelegraphSpec), alive: () => boolean): TelegraphHandle {
    const item: TelegraphItem = { spec, progress: 0, alive, dead: false };
    this.items.push(item);
    return {
      setProgress: (p) => (item.progress = Math.max(0, Math.min(1, p))),
      destroy: () => (item.dead = true),
    };
  }

  draw(time: number, reducedFlash: boolean): void {
    this.items = this.items.filter((i) => !i.dead && i.alive());
    const g = this.g;
    g.clear();
    const pulse = reducedFlash ? 0.75 + 0.1 * Math.sin(time * 6) : 0.6 + 0.35 * Math.sin(time * 22);
    for (const item of this.items) {
      const s = typeof item.spec === 'function' ? item.spec() : item.spec;
      const p = item.progress;
      switch (s.kind) {
        case 'circle':
          g.fillStyle(DANGER, 0.12);
          g.fillCircle(s.x, s.y, s.radius);
          g.fillStyle(DANGER, 0.3);
          g.fillCircle(s.x, s.y, s.radius * p);
          g.lineStyle(3, DANGER, pulse);
          g.strokeCircle(s.x, s.y, s.radius);
          break;
        case 'ring':
          g.lineStyle(s.thickness, DANGER, 0.12 + 0.2 * p);
          g.strokeCircle(s.x, s.y, s.radius);
          g.lineStyle(2, DANGER, pulse);
          g.strokeCircle(s.x, s.y, s.radius - s.thickness / 2);
          g.strokeCircle(s.x, s.y, s.radius + s.thickness / 2);
          break;
        case 'arc': {
          const a0 = s.angle - s.spread / 2;
          const a1 = s.angle + s.spread / 2;
          g.fillStyle(DANGER, 0.12);
          g.slice(s.x, s.y, s.radius, a0, a1, false);
          g.fillPath();
          g.fillStyle(DANGER, 0.3);
          g.slice(s.x, s.y, s.radius * p, a0, a1, false);
          g.fillPath();
          g.lineStyle(3, DANGER, pulse);
          g.slice(s.x, s.y, s.radius, a0, a1, false);
          g.strokePath();
          break;
        }
        case 'line': {
          const dx = Math.cos(s.angle);
          const dy = Math.sin(s.angle);
          const nx = -dy * (s.width / 2);
          const ny = dx * (s.width / 2);
          const quad = (len: number) => [
            { x: s.x + nx, y: s.y + ny },
            { x: s.x + dx * len + nx, y: s.y + dy * len + ny },
            { x: s.x + dx * len - nx, y: s.y + dy * len - ny },
            { x: s.x - nx, y: s.y - ny },
          ];
          g.fillStyle(DANGER, 0.12);
          g.fillPoints(quad(s.length), true);
          g.fillStyle(DANGER, 0.32);
          g.fillPoints(quad(s.length * p), true);
          g.lineStyle(2, DANGER, pulse);
          g.strokePoints(quad(s.length), true);
          // Chevrons marching along the line show direction.
          g.lineStyle(3, 0xffffff, 0.45 * pulse);
          const step = 34;
          const offset = (time * 120) % step;
          for (let d = offset; d < s.length - 10; d += step) {
            const cx = s.x + dx * d;
            const cy = s.y + dy * d;
            g.lineBetween(cx - dx * 8 + nx * 0.6, cy - dy * 8 + ny * 0.6, cx, cy);
            g.lineBetween(cx - dx * 8 - nx * 0.6, cy - dy * 8 - ny * 0.6, cx, cy);
          }
          break;
        }
      }
    }
  }

  clear(): void {
    this.items = [];
    this.g.clear();
  }

  destroy(): void {
    this.g.destroy();
  }
}

interface ShockwaveState {
  kind: 'shockwave';
  spec: Extract<HazardSpec, { kind: 'shockwave' }>;
  r: number;
  hit: boolean;
  label?: Phaser.GameObjects.Text;
}

interface LaserState {
  kind: 'laser';
  spec: Extract<HazardSpec, { kind: 'laser' }>;
  t: number;
  warned: boolean;
  fired: boolean;
}

export class HazardLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private items: (ShockwaveState | LaserState)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sfx: (id: string) => void,
  ) {
    this.g = scene.add.graphics().setDepth(2500);
  }

  add(spec: HazardSpec): void {
    if (spec.kind === 'shockwave') {
      const label = spec.label
        ? this.scene.add
            .text(spec.x, spec.y, spec.label, { fontFamily: 'Impact, "Arial Black", sans-serif', fontSize: '42px', color: '#ff4a3d', stroke: '#1a1424', strokeThickness: 8 })
            .setOrigin(0.5)
            .setDepth(2600)
            .setAngle(-8)
        : undefined;
      this.items.push({ kind: 'shockwave', spec, r: 8, hit: false, label });
    } else {
      this.items.push({ kind: 'laser', spec, t: 0, warned: false, fired: false });
    }
  }

  /** Advances hazards and damages the player on contact. */
  update(dt: number, time: number, player: Vec & { radius: number }, damage: (halves: number) => void, reducedFlash: boolean): void {
    const g = this.g;
    g.clear();
    for (const h of this.items) {
      if (h.kind === 'shockwave') {
        const s = h.spec;
        h.r += s.speed * dt;
        const d = Math.hypot(player.x - s.x, player.y - s.y);
        if (!h.hit && Math.abs(d - h.r) < s.thickness / 2 + player.radius) {
          h.hit = true;
          damage(s.damage);
        }
        const fade = 1 - h.r / s.maxRadius;
        g.lineStyle(s.thickness, 0xff6a3d, 0.25 + 0.5 * fade);
        g.strokeCircle(s.x, s.y, h.r);
        g.lineStyle(3, 0xfff1c9, 0.8 * fade);
        g.strokeCircle(s.x, s.y, h.r);
        if (h.label) h.label.setAlpha(Math.max(0, fade * 1.4)).setScale(1 + (1 - fade) * 0.4);
      } else {
        const s = h.spec;
        h.t += dt;
        const warnPhase = h.t < s.warn;
        if (warnPhase) {
          if (!h.warned) {
            h.warned = true;
            this.sfx('laser-warn');
          }
          const blink = reducedFlash ? 0.5 : Math.sin(time * 30) > 0 ? 0.8 : 0.25;
          this.dashed(s.x1, s.y1, s.x2, s.y2, 0xff3355, blink, 3);
        } else {
          if (!h.fired) {
            h.fired = true;
            this.sfx('laser');
          }
          g.lineStyle(s.width + 10, 0xff3355, 0.3);
          g.lineBetween(s.x1, s.y1, s.x2, s.y2);
          g.lineStyle(s.width, 0xff6680, 0.95);
          g.lineBetween(s.x1, s.y1, s.x2, s.y2);
          g.lineStyle(Math.max(2, s.width / 3), 0xffffff, 0.9);
          g.lineBetween(s.x1, s.y1, s.x2, s.y2);
          if (distToSegment(player.x, player.y, s.x1, s.y1, s.x2, s.y2) < s.width / 2 + player.radius) damage(s.damage);
        }
      }
    }
    this.items = this.items.filter((h) => {
      const done = h.kind === 'shockwave' ? h.r >= h.spec.maxRadius : h.t >= h.spec.warn + h.spec.active;
      if (done && h.kind === 'shockwave') h.label?.destroy();
      return !done;
    });
  }

  private dashed(x1: number, y1: number, x2: number, y2: number, color: number, alpha: number, width: number): void {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const dx = (x2 - x1) / len;
    const dy = (y2 - y1) / len;
    this.g.lineStyle(width, color, alpha);
    for (let d = 0; d < len; d += 22) {
      const e = Math.min(len, d + 12);
      this.g.lineBetween(x1 + dx * d, y1 + dy * d, x1 + dx * e, y1 + dy * e);
    }
  }

  count(): number {
    return this.items.length;
  }

  clear(): void {
    for (const h of this.items) if (h.kind === 'shockwave') h.label?.destroy();
    this.items = [];
    this.g.clear();
  }

  destroy(): void {
    this.clear();
    this.g.destroy();
  }
}

export function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / len2));
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}
