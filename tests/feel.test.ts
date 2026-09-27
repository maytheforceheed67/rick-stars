import { describe, expect, it } from 'vitest';
import { BASE_STATS, FEEL, PLAYER } from '../src/content/balance';
import { createRegistry } from '../src/content/registry';
import { GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT } from '../src/engine/constants';
import { clearMuzzle, FireGate, holdFor, rigPose, type Side } from '../src/engine/runtime/aim';
import { blinkTint, flashAlpha, flashLength, flashPeak, hurtEdgeProfile, hurtFade } from '../src/engine/runtime/flashes';
import { inputDirection, stepWalk, WalkCycle } from '../src/engine/runtime/motion';
import { episodeActs } from '../src/engine/registry';
import type { ItemDef } from '../src/engine/types';

const reg = createRegistry();
const morty = reg.characters.get('morty')!;
const shoulder = morty.holds!.shoulder;
const body = { x: 400, y: 300 };
const deg = (d: number) => (d * Math.PI) / 180;
const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

/** Every story weapon any act hands out. */
const storyWeapons = [...new Set([...reg.episodes.values()].flatMap((ep) => episodeActs(ep).flatMap((a) => (a.weapon ? [a.weapon.item] : []))))].map(
  (id) => reg.items.get(id) as ItemDef,
);

describe('every shot starts at the weapon', () => {
  it('has a held sprite for every gun, and something in hand for every throw', () => {
    expect(storyWeapons.length).toBeGreaterThanOrEqual(8);
    for (const item of storyWeapons) {
      const w = item.weapon!;
      if (w.style === 'thrown') expect(w.held ?? w.shot, item.id).toBeDefined();
      else expect(reg.sprites.has(w.held ?? ''), `${item.id} held sprite`).toBe(true);
    }
    // Every playable character knows where its shoulder is.
    for (const id of ['morty', 'jerry']) expect(reg.characters.get(id)?.holds, id).toBeDefined();
  });

  it('puts the muzzle out along the aim from the shoulder, for every weapon and direction', () => {
    for (const item of storyWeapons) {
      const w = item.weapon!;
      const hold = holdFor(shoulder, w);
      for (const d of [0, 30, 60, 90, 135, 180, -135, -90, -45]) {
        const a = deg(d);
        // Aim at a point far out along the angle from where the shoulder will be.
        const side: Side = Math.cos(a) < -FEEL.weapon.sideDeadZone ? -1 : 1;
        const sh = { x: body.x + shoulder.x * side, y: body.y + shoulder.y };
        const target = { x: sh.x + Math.cos(a) * 500, y: sh.y + Math.sin(a) * 500 };
        const pose = rigPose(body, target, hold, side);
        expect(close(pose.angle, Math.atan2(Math.sin(a), Math.cos(a)), 1e-9), `${item.id} ${d}°`).toBe(true);
        // Straight out along the aim (plus any across offset, which flips with the side).
        const along = hold.grip.x + hold.muzzle.x;
        const across = (hold.grip.y + hold.muzzle.y) * pose.side;
        const want = {
          x: pose.shoulder.x + Math.cos(a) * along - Math.sin(a) * across,
          y: pose.shoulder.y + Math.sin(a) * along + Math.cos(a) * across,
        };
        expect(close(pose.muzzle.x, want.x) && close(pose.muzzle.y, want.y), `${item.id} ${d}°`).toBe(true);
        // Never in Morty's middle: the muzzle is well clear of his center.
        expect(Math.hypot(pose.muzzle.x - body.x, pose.muzzle.y - (body.y + shoulder.y)), `${item.id} ${d}°`).toBeGreaterThan(18);
      }
    }
  });

  it("holds the weapon on the aim's side, with a dead zone around straight up and down", () => {
    const hold = holdFor(shoulder, undefined);
    expect(rigPose(body, deg(10), hold, -1).side).toBe(1);
    expect(rigPose(body, deg(170), hold, 1).side).toBe(-1);
    // Nearly straight up: keeps whichever side it was on, so it doesn't flicker.
    expect(rigPose(body, deg(-88), hold, 1).side).toBe(1);
    expect(rigPose(body, deg(-92), hold, -1).side).toBe(-1);
    // Aiming left mirrors the shoulder and flips the laser cat's eyes to stay on top.
    const cat = holdFor(shoulder, reg.items.get('laser-cat')!.weapon);
    const right = rigPose(body, 0, cat, 1);
    const left = rigPose(body, Math.PI, cat, -1);
    expect(close(right.shoulder.x - body.x, -(left.shoulder.x - body.x))).toBe(true);
    expect(close(right.muzzle.y, left.muzzle.y)).toBe(true);
  });

  it('keeps the gun at chest height: its shots fly over their floor point', () => {
    const pose = rigPose(body, 0, holdFor(shoulder, undefined), 1);
    expect(pose.lift).toBe(-shoulder.y);
    // Aiming sideways, the floor point under the muzzle is level with his feet.
    expect(close(pose.muzzle.y + pose.lift, body.y)).toBe(true);
  });

  it('pops a shot against a wall between Morty and his muzzle, and never past it', () => {
    // A wall from x = 420 on.
    const solid = (x: number) => x >= 420;
    const blocked = clearMuzzle({ x: 400, y: 300 }, { x: 440, y: 300 }, solid);
    expect(blocked.blocked).toBe(true);
    expect(blocked.at.x).toBeLessThan(420);
    expect(blocked.at.x).toBeGreaterThan(412);
    const open = clearMuzzle({ x: 400, y: 300 }, { x: 440, y: 300 }, () => false);
    expect(open).toEqual({ at: { x: 440, y: 300 }, blocked: false });
  });
});

describe('the trigger', () => {
  const dt = 1 / 60;
  const interval = 0.3;

  it('fires the same frame a press lands if the weapon is ready', () => {
    const gate = new FireGate();
    expect(gate.step(dt, true, true, interval, true)).toBe(true);
  });

  it('holds a press made while cooling down and fires the moment the weapon is ready', () => {
    const gate = new FireGate();
    // Frame 0: fires. Frame 1: released. Frame 2: pressed again, early in the cooldown, then released.
    expect(gate.step(dt, true, true, interval, true)).toBe(true);
    expect(gate.step(dt, false, false, interval, true)).toBe(false);
    expect(gate.step(dt, true, true, interval, true)).toBe(false);
    let fired = -1;
    for (let frame = 3; frame < 60 && fired < 0; frame++) if (gate.step(dt, false, false, interval, true)) fired = frame;
    // Fired on the first frame the cooldown allows, not one later, and not lost.
    expect(fired).toBe(Math.round(interval / dt));
  });

  it('keeps a press made while he cannot fire (a hit-stop) for the buffer window', () => {
    const gate = new FireGate();
    expect(gate.step(dt, true, false, interval, false)).toBe(false);
    expect(gate.step(dt, false, false, interval, true)).toBe(true);
    const late = new FireGate();
    late.step(dt, true, false, interval, false);
    const frames = Math.ceil(FEEL.weapon.fireBuffer / dt) + 1;
    for (let i = 0; i < frames; i++) late.step(dt, false, false, interval, false);
    expect(late.step(dt, false, false, interval, true)).toBe(false);
  });

  it('fires at the weapon rate from the first frame when held', () => {
    const gate = new FireGate();
    const shots: number[] = [];
    for (let f = 0; f < 600; f++) if (gate.step(dt, f === 0, true, interval, true)) shots.push(f);
    expect(shots[0]).toBe(0);
    // Ten seconds of holding: the rate matches the interval, give or take a frame.
    expect(shots.length).toBeGreaterThanOrEqual(Math.floor(10 / interval));
    expect(shots.length).toBeLessThanOrEqual(Math.ceil(10 / interval) + 1);
  });
});

describe('bullets you can read at a glance', () => {
  const sources = import.meta.glob('../src/content/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  /** Every enemy shot kind any brain fires, read straight out of the content code. */
  const kinds = new Set<string>();
  for (const text of Object.values(sources)) {
    for (const call of text.match(/shoot\(\{[^}]*\}/g) ?? []) {
      const kind = call.match(/kind: '([a-z-]+)'/)?.[1];
      if (kind) kinds.add(kind);
    }
  }
  // Brains that pass the kind through a helper (toss(api, 'kibble', ...)).
  for (const text of Object.values(sources)) for (const m of text.matchAll(/toss\(api, '([a-z-]+)'/g)) kinds.add(m[1]);

  it('finds the enemy shot kinds to check', () => {
    expect(kinds.size).toBeGreaterThanOrEqual(8);
    expect(kinds.has('bolt')).toBe(true);
  });

  it('draws every enemy shot round or chunky, never a streak', async () => {
    const { ENGINE_SPRITES } = await import('../src/engine/art/engineSprites');
    const art = new Map([...ENGINE_SPRITES, ...reg.sprites.values()].map((a) => [a.key, a]));
    for (const kind of kinds) {
      const a = art.get(`shot-${kind}`);
      expect(a, `shot-${kind}`).toBeDefined();
      const ratio = Math.max(a!.width, a!.height) / Math.min(a!.width, a!.height);
      expect(ratio, `shot-${kind} is ${a!.width}x${a!.height}`).toBeLessThanOrEqual(1.5);
    }
  });

  it("draws Morty's energy shots as long bolts pointing along their path", async () => {
    const { ENGINE_SPRITES } = await import('../src/engine/art/engineSprites');
    const bolt = ENGINE_SPRITES.find((a) => a.key === 'shot-bolt-edge')!;
    expect(bolt.width / bolt.height).toBeGreaterThanOrEqual(2.5);
  });
});

describe('movement that feels alive', () => {
  const dt = 1 / 60;
  const top = BASE_STATS.moveSpeed;
  const M = FEEL.move;
  const speed = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);
  /** Frames until `done`, walking with `input` from `v`. */
  const framesUntil = (v: { x: number; y: number }, input: { x: number; y: number }, done: (v: { x: number; y: number }) => boolean, t = top) => {
    for (let f = 1; f < 600; f++) {
      v = stepWalk(v, input, t, dt);
      if (done(v)) return { f, v };
    }
    return { f: Infinity, v };
  };

  it('gets to full speed in about 0.08 s: a ramp, not an instant jump', () => {
    const first = stepWalk({ x: 0, y: 0 }, { x: 1, y: 0 }, top, dt);
    expect(first.x).toBeGreaterThan(0);
    expect(first.x).toBeLessThan(top * 0.5);
    const { f } = framesUntil({ x: 0, y: 0 }, { x: 1, y: 0 }, (v) => speed(v) >= top - 1e-6);
    expect(f * dt).toBeGreaterThanOrEqual(M.startSeconds - dt);
    expect(f * dt).toBeLessThanOrEqual(M.startSeconds + dt);
  });

  it('stops dead in about 0.06 s, with no drift', () => {
    const { f } = framesUntil({ x: top, y: 0 }, { x: 0, y: 0 }, (v) => speed(v) === 0);
    expect(f * dt).toBeLessThanOrEqual(M.stopSeconds + dt);
    // Stopping distance: about half the speed times the stopping time.
    let v = { x: top, y: 0 };
    let dist = 0;
    for (let i = 0; i < 60; i++) {
      v = stepWalk(v, { x: 0, y: 0 }, top, dt);
      dist += v.x * dt;
    }
    expect(dist).toBeLessThanOrEqual((top * M.stopSeconds) / 2 + top * dt);
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it('brakes harder turning around than stopping, so a 180 feels immediate', () => {
    const reverse = framesUntil({ x: top, y: 0 }, { x: -1, y: 0 }, (v) => v.x <= 0);
    const stop = framesUntil({ x: top, y: 0 }, { x: 0, y: 0 }, (v) => v.x <= 0);
    expect(reverse.f).toBeLessThan(stop.f);
    // And he's at full speed the other way soon after.
    const back = framesUntil({ x: top, y: 0 }, { x: -1, y: 0 }, (v) => v.x <= -top + 1e-6);
    expect(back.f * dt).toBeLessThanOrEqual(M.turnSeconds + M.startSeconds + 2 * dt);
    // A 90 degree turn sheds the old sideways speed just as fast.
    const side = framesUntil({ x: top, y: 0 }, { x: 0, y: 1 }, (v) => v.x === 0);
    expect(side.f * dt).toBeLessThanOrEqual(M.turnSeconds + dt);
  });

  it('moves as fast on a diagonal as on a straight line (within 2%)', () => {
    const d = inputDirection(1, 1);
    expect(speed(d)).toBeCloseTo(1, 9);
    const { v } = framesUntil({ x: 0, y: 0 }, d, () => false);
    expect(Math.abs(speed(v) - top) / top).toBeLessThanOrEqual(0.02);
    // Straight lines are left alone.
    expect(inputDirection(1, 0)).toEqual({ x: 1, y: 0 });
  });

  it('keeps the same snappy ramp when sneaking or slowed, just a lower top speed', () => {
    for (const k of [PLAYER.sneakSpeedMult, PLAYER.slowTileMult, 0.7]) {
      const slow = top * k;
      const { f, v } = framesUntil({ x: 0, y: 0 }, { x: 1, y: 0 }, (w) => speed(w) >= slow - 1e-6, slow);
      expect(f * dt, `x${k}`).toBeLessThanOrEqual(M.startSeconds + dt);
      expect(speed(v)).toBeCloseTo(slow, 6);
    }
    // Slowed down mid-stride, he eases down to the new top speed rather than snapping.
    const eased = stepWalk({ x: top, y: 0 }, { x: 1, y: 0 }, top * 0.5, dt);
    expect(eased.x).toBeLessThan(top);
    expect(eased.x).toBeGreaterThan(top * 0.5);
  });

  it('walks in step: a foot up in each step, left and right in turn, and two bobs a stride', () => {
    const w = new WalkCycle();
    const feet: number[] = [];
    let bobs = 0;
    let last = 0;
    let rising = false;
    for (let i = 0; i < 200; i++) {
      w.advance(M.stepLength / 100);
      if (w.stride !== 0 && feet[feet.length - 1] !== w.stride) feet.push(w.stride);
      const b = -w.bob();
      if (b > last) rising = true;
      else if (rising && b < last) {
        bobs++;
        rising = false;
      }
      last = b;
    }
    // Two steps is one stride: right foot, left foot, and a bob on each.
    expect(feet).toEqual([1, -1]);
    expect(bobs).toBe(2);
    expect(Math.max(...Array.from({ length: 100 }, (_, i) => ((w.phase = i / 100), -w.bob())))).toBeCloseTo(M.bobPx, 1);
  });

  it('gives everyone who walks in a scene a walk cycle, and anyone you can play a free arm too', () => {
    const people = [...reg.characters.values()].filter((c) => c.sprite);
    expect(people.length).toBeGreaterThanOrEqual(15);
    for (const c of people) {
      expect(c.sprite!.poses, c.id).toBeTruthy();
      // Holding a weapon needs the frames with the weapon's arm left out.
      if (c.holds) expect(c.sprite!.poses, c.id).toBe(true);
    }
    // Art a scene swaps in (Snuffles getting his helmet) walks too.
    for (const key of ['snuffles-helmet', 'snuffles-arm']) expect(reg.sprites.get(key)?.poses, key).toBeTruthy();
  });
});

describe('getting hurt never hides the danger', () => {
  const H = FEEL.hurt;
  const F = FEEL.flash;
  /** The play area: the screen below the HUD strip. */
  const W = GAME_WIDTH;
  const V = GAME_HEIGHT - HUD_HEIGHT;
  const code = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

  it('shows a hit as a red glow at the edge for 80-120 ms, never a wash over the middle', () => {
    expect(H.edgeMs).toBeGreaterThanOrEqual(80);
    expect(H.edgeMs).toBeLessThanOrEqual(120);
    expect(hurtFade(0, false)).toBe(1);
    expect(hurtFade(H.edgeMs - 1, false)).toBeGreaterThan(0);
    expect(hurtFade(H.edgeMs, false)).toBe(0);
    // Strongest right at the edge, nothing past its band, and the band is a thin strip.
    const band = H.edgeBand * V;
    expect(hurtEdgeProfile(0, V)).toBeCloseTo(H.edgeAlpha, 9);
    expect(hurtEdgeProfile(band, V)).toBe(0);
    expect(band / V).toBeLessThanOrEqual(0.15);
    // The play area in the middle stays fully clear, at every moment of the glow.
    for (let x = 0; x <= W; x += 8) {
      for (let y = 0; y <= V; y += 8) {
        if (x < W * 0.15 || x > W * 0.85 || y < V * 0.15 || y > V * 0.85) continue;
        expect(hurtEdgeProfile(Math.min(x, y, W - x, V - y), V), `${x},${y}`).toBe(0);
      }
    }
    // Getting hurt doesn't also flash the whole screen.
    const run = code['../src/scenes/RunScene.ts'];
    const hurt = run.slice(run.indexOf('  damagePlayer('), run.indexOf('  healPlayer('));
    expect(hurt).toContain('this.fx.hurt()');
    expect(hurt).not.toContain('.flash(');
  });

  it('makes it a thin red border with Reduced flashes', () => {
    expect(H.borderPx).toBeGreaterThan(0);
    expect(H.borderPx).toBeLessThanOrEqual(8);
    expect(hurtFade(H.borderMs / 2, true)).toBeGreaterThan(0);
    expect(hurtFade(H.borderMs, true)).toBe(0);
  });

  it('keeps every full-screen flash faint while there are bullets on screen', () => {
    // Every flash the game asks for, read straight out of the code.
    const asked: number[] = [];
    for (const [file, text] of Object.entries(code)) {
      if (file.endsWith('Fx.ts')) continue;
      for (const m of text.matchAll(/\bflash\([^;]*?,\s*(\d+)\)/g)) asked.push(Number(m[1]));
    }
    expect(asked.length).toBeGreaterThanOrEqual(12);
    expect(F.busyAlpha).toBeLessThanOrEqual(0.25);
    for (const ms of asked) {
      for (const reduced of [false, true]) {
        const peak = flashPeak(reduced);
        const len = flashLength(ms, reduced);
        for (let t = 0; t <= len; t += 5) {
          // With shots on screen: at most ~25%, however long the flash is.
          expect(flashAlpha(peak, len, t, true), `${ms} ms at ${t}`).toBeLessThanOrEqual(0.25);
          // Never solid, even with nothing to dodge.
          expect(flashAlpha(peak, len, t, false)).toBeLessThan(1);
        }
        expect(flashAlpha(peak, len, len, false)).toBe(0);
      }
    }
    expect(flashPeak(true)).toBeLessThanOrEqual(F.busyAlpha);
    // Nothing goes around the rule with the camera's own solid flash.
    for (const [file, text] of Object.entries(code)) expect(text, file).not.toMatch(/(cam|cameras\.main)\.flash\(/);
  });

  it('blinks Morty after a hit with a tint, never fading him out', () => {
    let flips = 0;
    let last = blinkTint(0, false);
    const seen = new Set<number>([last]);
    for (let f = 1; f <= 60; f++) {
      const c = blinkTint(f / 60, false);
      if (c !== last) flips++;
      last = c;
      seen.add(c);
    }
    // His own colors and the bright red tint in turn, several times a second.
    expect([...seen].sort()).toEqual([H.blinkTint, 0xffffff].sort());
    expect(flips).toBeGreaterThanOrEqual(H.blinkHz);
    // The tint keeps him bright: every channel at least 40% (a tint only multiplies, never hides).
    for (const c of seen) for (const shift of [16, 8, 0]) expect((c >> shift) & 0xff).toBeGreaterThanOrEqual(0x66);
    // With Reduced flashes: a slow pulse (under 3 a second), no hard flicker: small steps from
    // one frame to the next, where the flicker jumps all the way at once.
    expect(H.pulseHz).toBeLessThan(3);
    for (let f = 1; f <= 120; f++) {
      const a = blinkTint((f - 1) / 60, true);
      const b = blinkTint(f / 60, true);
      for (const shift of [16, 8, 0]) expect(Math.abs(((a >> shift) & 0xff) - ((b >> shift) & 0xff))).toBeLessThanOrEqual(20);
    }
    // The blink never touches his alpha.
    const player = code['../src/engine/runtime/Player.ts'];
    expect(player).not.toMatch(/alpha \*= [^;]*sin/);
  });
});
