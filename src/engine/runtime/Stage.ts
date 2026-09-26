/**
 * In-engine acted scenes: characters walk in, talk in speech bubbles and act out a story beat in
 * the room itself (Rick strolling into the gym to freeze Frank). Steps run one after another;
 * skip() fast-forwards through whatever is left, still running every `do` step so the story
 * ends up in the same place.
 */
import Phaser from 'phaser';
import { TEXTURE_PAD } from '../art/textures';
import type { ContentId, SceneSpot, SceneStep, Vec } from '../types';
import type { Fx } from './Fx';

export interface StageHost {
  readonly scene: Phaser.Scene;
  readonly fx: Fx;
  /** The playable character's id: that actor is the player himself. */
  playerId(): ContentId;
  playerPos(): Vec;
  movePlayer(x: number, y: number): void;
  facePlayer(left: boolean): void;
  /** A character's world sprite key, if it has one. */
  spriteKey(who: ContentId): string | null;
  say(who: ContentId, text: string, seconds: number): void;
  /** Registers where a character's speech bubbles go (null removes it). */
  setAnchor(who: ContentId, anchor: (() => Vec | null) | null): void;
  /** Where someone walking in comes from: the door nearest `to`, or the room's edge. */
  doorNear(to: Vec): Vec;
  /** Keeps a spot inside the room's walls. */
  clamp(p: Vec): Vec;
  sfx(id: string): void;
}

interface Actor {
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
}

/** Pixels per second people walk at in scenes. */
const WALK_SPEED = 200;

/** Seconds a line stays up: long enough to read it. */
export function readTime(text: string): number {
  return Math.min(4.2, Math.max(1.5, 0.9 + text.length * 0.045));
}

export class Stage {
  private readonly actors = new Map<ContentId, Actor>();
  private steps: SceneStep[] = [];
  private onDone: (() => void) | null = null;
  private skipping = false;
  /** Completes the step in progress right away (set while a step waits on a timer or tween). */
  private finishStep: (() => void) | null = null;
  private stepToken = 0;
  running = false;

  constructor(private readonly host: StageHost) {}

  play(steps: SceneStep[], onDone?: () => void): void {
    if (this.running) this.skip();
    this.running = true;
    this.skipping = false;
    this.steps = [...steps];
    this.onDone = onDone ?? null;
    this.next();
  }

  /** Fast-forwards to the end of the scene. */
  skip(): void {
    if (!this.running || this.skipping) return;
    this.skipping = true;
    this.host.fx.clearBubbles();
    const finish = this.finishStep;
    this.finishStep = null;
    finish?.();
  }

  /** Where a character is standing right now (actors, or the player). */
  position(who: ContentId): Vec | null {
    if (who === this.host.playerId()) return this.host.playerPos();
    const a = this.actors.get(who);
    return a ? { x: a.img.x, y: a.img.y } : null;
  }

  has(who: ContentId): boolean {
    return this.actors.has(who);
  }

  /** Removes every actor and drops any scene in progress (leaving the room). */
  clear(): void {
    this.running = false;
    this.steps = [];
    this.onDone = null;
    this.finishStep = null;
    this.stepToken++;
    for (const who of [...this.actors.keys()]) this.removeActor(who);
  }

  // ---- steps -----------------------------------------------------------------------------------

  private next(): void {
    if (!this.running) return;
    const step = this.steps.shift();
    if (!step) {
      this.running = false;
      this.skipping = false;
      const done = this.onDone;
      this.onDone = null;
      done?.();
      return;
    }
    const token = ++this.stepToken;
    let finished = false;
    this.runStep(step, () => {
      if (finished || token !== this.stepToken) return;
      finished = true;
      this.finishStep = null;
      this.next();
    });
  }

  private runStep(step: SceneStep, done: () => void): void {
    const skipping = this.skipping;
    switch (step.kind) {
      case 'wait':
        this.delay(step.seconds, done);
        return;
      case 'do':
        step.fn();
        done();
        return;
      case 'say': {
        const secs = step.seconds ?? readTime(step.text);
        if (skipping) return done();
        this.host.say(step.who, step.text, secs + 0.5);
        this.delay(secs, done);
        return;
      }
      case 'face': {
        const me = this.position(step.who);
        if (me) this.face(step.who, this.spot(step.toward, step.who).x < me.x);
        done();
        return;
      }
      case 'enter':
        this.enter(step.who, step.via, step.to, done);
        return;
      case 'walk':
        this.walk(step.who, this.spot(step.to, step.who), step.speed ?? WALK_SPEED, done);
        return;
      case 'emote':
        this.emote(step.who, step.emote, done);
        return;
      case 'beam':
        this.beam(step.who, this.spot(step.to, step.who), step.color, step.sfx, done);
        return;
      case 'leave':
        this.leave(step.who, step.via, done);
        return;
    }
  }

  private delay(seconds: number, done: () => void): void {
    if (this.skipping || seconds <= 0) return done();
    const t = this.host.scene.time.delayedCall(seconds * 1000, done);
    this.finishStep = () => {
      t.remove(false);
      done();
    };
  }

  /** Tweens `target` to `props`, or jumps there when skipping. */
  private tweenTo(target: Record<string, number>, props: Record<string, number>, ms: number, done: () => void, onUpdate?: () => void, ease = 'Sine.easeInOut'): void {
    if (this.skipping || ms <= 0) {
      Object.assign(target, props);
      onUpdate?.();
      done();
      return;
    }
    const tw = this.host.scene.tweens.add({ targets: target, ...props, duration: ms, ease, onUpdate, onComplete: done });
    this.finishStep = () => {
      tw.stop();
      Object.assign(target, props);
      onUpdate?.();
      done();
    };
  }

  private spot(s: SceneSpot, forWho?: ContentId): Vec {
    if ('near' in s) {
      const other = this.position(s.near) ?? this.host.playerPos();
      const me = forWho ? this.position(forWho) : null;
      const side = s.side ?? (me && me.x < other.x ? -1 : 1);
      return this.host.clamp({ x: other.x + side * (s.gap ?? 70), y: other.y + 4 });
    }
    return this.host.clamp(s);
  }

  private face(who: ContentId, left: boolean): void {
    if (who === this.host.playerId()) this.host.facePlayer(left);
    else this.actors.get(who)?.img.setFlipX(left);
  }

  private enter(who: ContentId, via: 'door' | 'portal' | 'here', to: SceneSpot, done: () => void): void {
    if (who === this.host.playerId()) {
      const p = this.spot(to, who);
      this.walk(who, p, WALK_SPEED, done);
      return;
    }
    const dest = this.spot(to);
    if (via === 'door') {
      const from = this.host.doorNear(dest);
      const a = this.addActor(who, from);
      if (!a) return done();
      a.img.setAlpha(0);
      this.host.scene.tweens.add({ targets: [a.img, a.shadow], alpha: { from: 0, to: 1 }, duration: 180 });
      if (this.skipping) a.img.setAlpha(1);
      this.walk(who, dest, WALK_SPEED, done);
      return;
    }
    const a = this.addActor(who, dest);
    if (!a) return done();
    if (via === 'here') {
      a.img.setAlpha(0);
      this.tweenTo(a.img as unknown as Record<string, number>, { alpha: 1 }, 220, done);
      return;
    }
    // Out of a green portal.
    const swirl = this.host.scene.add.image(dest.x, dest.y - 26, 'exit-portal').setDepth(dest.y - 1).setScale(0.1);
    this.host.sfx('portal');
    this.host.fx.burst('portal', dest.x, dest.y - 26);
    this.host.scene.tweens.add({ targets: swirl, scale: 0.9, duration: 180, ease: 'Back.easeOut' });
    a.img.setScale(0.2);
    this.tweenTo(
      a.img as unknown as Record<string, number>,
      { scale: 1 },
      260,
      () => {
        this.host.scene.tweens.add({ targets: swirl, scale: 0, alpha: 0, delay: 200, duration: 220, onComplete: () => swirl.destroy() });
        if (this.skipping) swirl.destroy();
        done();
      },
      undefined,
      'Back.easeOut',
    );
  }

  private walk(who: ContentId, to: Vec, speed: number, done: () => void): void {
    const from = this.position(who);
    if (!from) return done();
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    if (dist < 2) return done();
    this.face(who, to.x < from.x);
    const proxy = { x: from.x, y: from.y, t: 0 };
    const isPlayer = who === this.host.playerId();
    const actor = this.actors.get(who);
    const update = () => {
      if (isPlayer) this.host.movePlayer(proxy.x, proxy.y);
      else if (actor) {
        actor.img.setPosition(proxy.x, proxy.y).setDepth(proxy.y).setAngle(Math.sin(proxy.t * 16) * 5);
        actor.shadow.setPosition(proxy.x, proxy.y + 12);
      }
    };
    this.tweenTo(
      proxy,
      { x: to.x, y: to.y, t: dist / speed },
      (dist / speed) * 1000,
      () => {
        actor?.img.setAngle(0);
        done();
      },
      update,
      'Linear',
    );
  }

  private emote(who: ContentId, emote: 'jump' | 'shake' | 'shock', done: () => void): void {
    const pos = this.position(who);
    if (!pos || this.skipping) return done();
    const actor = this.actors.get(who);
    if (emote === 'shock') this.host.fx.floatText(pos.x, pos.y - 90, '!', '#ffe27a', 30);
    if (!actor) {
      // The player: a quick hop in place.
      this.delay(0.3, done);
      return;
    }
    const img = actor.img as unknown as Record<string, number>;
    if (emote === 'shake') {
      const x = actor.img.x;
      this.host.scene.tweens.add({ targets: actor.img, x: x + 4, duration: 50, yoyo: true, repeat: 3, onComplete: () => actor.img.setX(x) });
      this.delay(0.4, done);
      return;
    }
    const y = actor.img.y;
    this.host.scene.tweens.add({ targets: img, y: y - 18, duration: 120, yoyo: true, ease: 'Quad.easeOut', onComplete: () => actor.img.setY(y) });
    this.delay(0.3, done);
  }

  private beam(who: ContentId, to: Vec, color: number, sfx: string | undefined, done: () => void): void {
    const from = this.position(who);
    if (!from || this.skipping) return done();
    const left = to.x < from.x;
    this.face(who, left);
    const hand = { x: from.x + (left ? -20 : 20), y: from.y - 34 };
    if (sfx) this.host.sfx(sfx);
    const g = this.host.scene.add.graphics().setDepth(5000);
    const draw = (k: number) => {
      const ex = hand.x + (to.x - hand.x) * k;
      const ey = hand.y + (to.y - 20 - hand.y) * k;
      g.clear();
      g.lineStyle(20, color, 0.25);
      g.lineBetween(hand.x, hand.y, ex, ey);
      g.lineStyle(7, color, 0.95);
      g.lineBetween(hand.x, hand.y, ex, ey);
      g.lineStyle(2.5, 0xffffff, 1);
      g.lineBetween(hand.x, hand.y, ex, ey);
    };
    const proxy = { k: 0 };
    this.host.fx.pop(hand.x, hand.y, 'fx-star', color, 0.6, 2, 160);
    this.tweenTo(
      proxy,
      { k: 1 },
      160,
      () => {
        this.host.fx.burst('ice', to.x, to.y - 20, 12);
        this.host.fx.flash(color, 90);
        this.host.scene.tweens.add({ targets: g, alpha: 0, delay: 260, duration: 240, onComplete: () => g.destroy() });
        if (this.skipping) g.destroy();
        this.delay(0.35, done);
      },
      () => draw(proxy.k),
    );
  }

  private leave(who: ContentId, via: 'door' | 'portal', done: () => void): void {
    const a = this.actors.get(who);
    if (!a) return done();
    if (via === 'door') {
      const door = this.host.doorNear({ x: a.img.x, y: a.img.y });
      this.walk(who, door, WALK_SPEED, () => {
        this.removeActor(who);
        done();
      });
      return;
    }
    this.host.sfx('portal');
    this.host.fx.burst('portal', a.img.x, a.img.y - 26);
    this.tweenTo(a.img as unknown as Record<string, number>, { scale: 0.1, alpha: 0 }, 240, () => {
      this.removeActor(who);
      done();
    });
  }

  // ---- actors ----------------------------------------------------------------------------------

  private addActor(who: ContentId, at: Vec): Actor | null {
    const existing = this.actors.get(who);
    if (existing) {
      existing.img.setPosition(at.x, at.y);
      existing.shadow.setPosition(at.x, at.y + 12);
      return existing;
    }
    const key = this.host.spriteKey(who);
    if (!key) return null;
    const scene = this.host.scene;
    const img = scene.add.image(at.x, at.y, key).setDepth(at.y);
    // Stand on the same line as the player: his origin is his body, a little above his feet.
    const fh = img.frame.height;
    img.setOrigin(0.5, (fh - TEXTURE_PAD - 12) / fh);
    const shadow = scene.add.ellipse(at.x, at.y + 12, 34, 10, 0x000000, 0.22).setDepth(-400);
    const actor = { img, shadow };
    this.actors.set(who, actor);
    this.host.setAnchor(who, () => (img.active ? { x: img.x, y: img.y - img.displayHeight * img.originY - 6 } : null));
    return actor;
  }

  private removeActor(who: ContentId): void {
    const a = this.actors.get(who);
    if (!a) return;
    a.img.destroy();
    a.shadow.destroy();
    this.actors.delete(who);
    this.host.setAnchor(who, null);
  }
}
