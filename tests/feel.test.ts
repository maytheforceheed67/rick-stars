import { describe, expect, it } from 'vitest';
import { FEEL } from '../src/content/balance';
import { createRegistry } from '../src/content/registry';
import { clearMuzzle, FireGate, holdFor, rigPose, type Side } from '../src/engine/runtime/aim';
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
