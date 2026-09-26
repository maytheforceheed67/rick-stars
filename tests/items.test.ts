import { describe, expect, it, vi } from 'vitest';
import { BASE_STATS, ITEM_RULES, STAT_LIMITS } from '../src/content/balance';
import { createRegistry } from '../src/content/registry';
import { activeSynergies, activeTransformations, hookSources, itemModifiers, runHook } from '../src/engine/effects/hooks';
import { Inventory } from '../src/engine/effects/inventory';
import { computeStats } from '../src/engine/effects/stats';
import { StatusManager } from '../src/engine/effects/status';
import { Rng } from '../src/engine/rng';
import { episodeActs } from '../src/engine/registry';
import type { EnemyRef, GameCtx, HitInfo, ItemDef, ItemEffect } from '../src/engine/types';

const reg = createRegistry();
const item = (id: string) => reg.items.get(id)!;

function mockCtx(): GameCtx & { shots: number; frozen: string[] } {
  const ctx = {
    rng: new Rng('mock'),
    player: { x: 0, y: 0 },
    shots: 0,
    frozen: [] as string[],
    playerShot: () => void ctx.shots++,
    freeze: (e: EnemyRef) => void ctx.frozen.push(String(e.uid)),
    sfx: () => undefined,
    vfx: vi.fn(),
    explode: vi.fn(),
    damageEnemy: vi.fn(),
    poison: vi.fn(),
    slow: vi.fn(),
    enemies: () => [enemy],
    after: (_s: number, fn: () => void) => fn(),
  };
  return ctx as unknown as GameCtx & { shots: number; frozen: string[] };
}

const enemy = { uid: 7, x: 10, y: 10, alive: true, stunned: false, slowed: false, poisoned: false } as EnemyRef;
const hit = (h: Partial<HitInfo>): HitInfo => ({ source: 'shot', damage: 3, wasFrozen: false, killed: false, ...h });

describe('stats', () => {
  it('adds first, then multiplies, then clamps', () => {
    const s = computeStats({ damage: 3, fireRate: 3 }, [{ add: { damage: 1 } }, { mult: { damage: 2 } }, { add: { damage: 1 }, mult: { fireRate: 100 } }], { fireRate: [0.5, 12] });
    expect(s.damage).toBe((3 + 1 + 1) * 2);
    expect(s.fireRate).toBe(12);
  });

  it('stacks item stats (including weapons) on the base stats', () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('contraband-blaster'));
    inv.add(item('letterman-jacket'));
    inv.add(item('hall-pass'));
    const s = computeStats(BASE_STATS, itemModifiers(inv, reg.items, reg.synergies), STAT_LIMITS);
    expect(s.damage).toBeCloseTo(BASE_STATS.damage * 0.7);
    expect(s.projectiles).toBe(3);
    expect(s.maxHearts).toBe(BASE_STATS.maxHearts + 1);
    expect(s.moveSpeed).toBeCloseTo(BASE_STATS.moveSpeed * 1.25);
    inv.add(item('ricks-ray-gun'));
    const s2 = computeStats(BASE_STATS, itemModifiers(inv, reg.items, reg.synergies), STAT_LIMITS);
    expect(s2.damage).toBeCloseTo(BASE_STATS.damage * 0.7 * 1.5);
  });
});

describe('statuses', () => {
  const statuses = () => new StatusManager((id) => reg.statuses.get(id));

  it('ticks seconds-based statuses and chains Genius into Side Effects', () => {
    const m = statuses();
    m.add('genius');
    expect(m.modifiers().length).toBe(1);
    expect(m.tick(19)).toEqual([]);
    const changes = m.tick(2);
    expect(changes).toEqual([{ expired: 'genius', applied: 'side-effects' }]);
    expect(m.has('side-effects')).toBe(true);
    expect(m.flags().noDash).toBe(true);
    m.tick(6.1);
    expect(m.has('side-effects')).toBe(false);
  });

  it('counts down room-based statuses on room clears and ends act statuses with the act', () => {
    const m = statuses();
    m.add('broken-legs');
    m.add('sleep-deprived');
    m.add('failing-grade');
    m.roomCleared();
    expect(m.has('broken-legs')).toBe(true);
    m.roomCleared();
    expect(m.has('broken-legs')).toBe(false);
    expect(m.has('sleep-deprived')).toBe(true);
    expect(m.actEnded().sort()).toEqual(['failing-grade', 'sleep-deprived']);
  });

  it('refreshes instead of stacking', () => {
    const m = statuses();
    expect(m.add('drunk')).toBe(true);
    m.tick(3);
    expect(m.add('drunk')).toBe(false);
    expect(m.list()[0].remaining).toBe(5);
  });
});

describe('inventory', () => {
  it('does not stack passives, swaps actives and consumables', () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    expect(inv.add(item('dodgeball')).added).toBe(true);
    expect(inv.add(item('dodgeball')).added).toBe(false);
    expect(inv.add(item('ricks-flask')).dropped).toBeUndefined();
    expect(inv.add(item('neutrino-bomb')).dropped).toEqual({ id: 'ricks-flask', charge: 3 });
    expect(inv.add(item('mystery-meat')).dropped).toBeUndefined();
    expect(inv.add(item('travel-pillow')).dropped).toEqual({ id: 'mystery-meat' });
  });

  it("keeps an active item's charge through a swap, so swapping back can't recharge it", () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('ricks-flask'));
    inv.spendActive();
    expect(inv.swapsOut(item('neutrino-bomb'))).toBe('ricks-flask');
    const first = inv.add(item('neutrino-bomb'));
    expect(first.dropped).toEqual({ id: 'ricks-flask', charge: 0 });
    // A fresh active item comes charged.
    expect(inv.activeReady()).toBe(true);
    inv.spendActive();
    // Picking the flask back up restores its old charge, not a full one.
    const back = inv.add(item('ricks-flask'), { charge: first.dropped!.charge });
    expect(inv.active).toMatchObject({ id: 'ricks-flask', charge: 0 });
    expect(inv.activeReady()).toBe(false);
    expect(back.dropped).toEqual({ id: 'neutrino-bomb', charge: 0 });
    expect(inv.swapsOut(item('ricks-flask'))).toBeNull();
  });

  it('charges active items by cleared rooms', () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('detention-slip'));
    expect(inv.activeReady()).toBe(true);
    inv.spendActive();
    expect(inv.activeReady()).toBe(false);
    for (let i = 0; i < 3; i++) expect(inv.chargeActive()).toBe(false);
    expect(inv.chargeActive()).toBe(true);
  });
});

describe('hooks and synergies', () => {
  it('only activates a synergy when every required item is owned', () => {
    expect(activeSynergies(['freeze-ray-mod'], reg.synergies)).toEqual([]);
    expect(activeSynergies(['freeze-ray-mod', 'franks-switchblade'], reg.synergies).map((s) => s.id)).toEqual(['ice-cold-blade']);
  });

  it("runs Frank's Switchblade on dash contact", () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('franks-switchblade'));
    const ctx = mockCtx();
    runHook(hookSources(inv, reg.items, reg.synergies), 'onDashContact', ctx, enemy);
    expect(ctx.damageEnemy).toHaveBeenCalledWith(enemy, 12, 'slash');
    expect(ctx.vfx).toHaveBeenCalledWith(expect.objectContaining({ kind: 'slash' }));
  });

  it('Ice-Cold Blade bursts frozen enemies into shards', () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('freeze-ray-mod'));
    inv.add(item('franks-switchblade'));
    const ctx = mockCtx();
    const sources = hookSources(inv, reg.items, reg.synergies);
    runHook(sources, 'onKill', ctx, enemy, hit({ source: 'slash', wasFrozen: true, killed: true }));
    expect(ctx.shots).toBe(8);
    runHook(sources, 'onKill', ctx, enemy, hit({ source: 'shot', wasFrozen: true, killed: true }));
    expect(ctx.shots).toBe(8);
  });

  it('Absolute Zero freezes whatever survives the Neutrino Bomb', () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('freeze-ray-mod'));
    inv.add(item('neutrino-bomb'));
    const ctx = mockCtx();
    const sources = hookSources(inv, reg.items, reg.synergies);
    runHook(sources, 'onHit', ctx, enemy, hit({ source: 'explosion', tag: 'neutrino' }));
    expect(ctx.frozen).toEqual(['7']);
    runHook(sources, 'onHit', ctx, enemy, hit({ source: 'explosion', tag: 'neutrino', killed: true }));
    expect(ctx.frozen).toEqual(['7']);
  });

  it('Dodge, Dip, Dissolve poisons bounced shots and splashes acid', () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('chemistry-set'));
    inv.add(item('dodgeball'));
    const ctx = mockCtx();
    const sources = hookSources(inv, reg.items, reg.synergies);
    runHook(sources, 'onHit', ctx, enemy, hit({ bounced: false }));
    expect(ctx.poison).not.toHaveBeenCalled();
    runHook(sources, 'onHit', ctx, enemy, hit({ bounced: true }));
    expect(ctx.poison).toHaveBeenCalledOnce();
    expect(ctx.explode).toHaveBeenCalledWith(expect.objectContaining({ tag: 'acid', small: true }));
  });

  it('turns on every synergy from exactly its two items, with a SYNERGY! line to show', () => {
    expect(reg.synergies.filter((s) => s.firstAppears === 'S01E01').length).toBeGreaterThanOrEqual(12);
    for (const s of reg.synergies) {
      expect(s.effect.length, s.id).toBeGreaterThan(10);
      // None of it alone, all of it together.
      for (const id of s.requires) expect(activeSynergies([id], reg.synergies).map((x) => x.id), s.id).not.toContain(s.id);
      expect(activeSynergies(s.requires, reg.synergies).map((x) => x.id), s.id).toContain(s.id);
      // Every synergy does something: stats or hooks.
      expect(!!s.stats || !!s.hooks, s.id).toBe(true);
      // Never needs two actives at once (Morty can only hold one).
      expect(s.requires.filter((id) => reg.items.get(id)?.kind === 'active').length, s.id).toBeLessThanOrEqual(1);
    }
  });

  it('Stamped enemies take extra damage with Paper Pushers, but the bonus never loops', () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('customs-stamp'));
    inv.add(item('red-tape'));
    const ctx = mockCtx();
    const sources = hookSources(inv, reg.items, reg.synergies);
    const stamped = { ...enemy, slowed: true } as EnemyRef;
    runHook(sources, 'onHit', ctx, stamped, hit({ damage: 4 }));
    expect(ctx.damageEnemy).toHaveBeenCalledWith(stamped, 2, 'shard', 'paperwork');
    runHook(sources, 'onHit', ctx, stamped, hit({ damage: 2, tag: 'paperwork' }));
    expect(ctx.damageEnemy).toHaveBeenCalledTimes(1);
  });
});

describe('transformations', () => {
  it('the Pilot has Garage Tinkerer and Seed Smuggler, each needing any 3 of its set', () => {
    const pilot = reg.transformations.filter((t) => t.firstAppears === 'S01E01').map((t) => t.id);
    expect(pilot).toEqual(['garage-tinkerer', 'seed-smuggler']);
    for (const t of reg.transformations) {
      const set = t.set;
      expect(activeTransformations(set.slice(0, 2), reg.transformations).map((x) => x.id), t.id).not.toContain(t.id);
      expect(activeTransformations(set.slice(0, 3), reg.transformations).map((x) => x.id), t.id).toContain(t.id);
      // Any three, not just the first three.
      expect(activeTransformations(set.slice(-3), reg.transformations).map((x) => x.id), t.id).toContain(t.id);
      // A new look and a strong bonus.
      expect(t.look.shirt !== undefined || !!t.look.accessory, t.id).toBe(true);
      expect(!!t.stats || !!t.hooks, t.id).toBe(true);
    }
  });

  it("adds the transformation's stats once Morty holds three of the set", () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('calculator'));
    inv.add(item('pencil-sharpener'));
    const before = computeStats(BASE_STATS, itemModifiers(inv, reg.items, reg.synergies, reg.transformations), STAT_LIMITS);
    expect(before.orbit).toBe(0);
    inv.add(item('junk-drone-buddy'));
    const after = computeStats(BASE_STATS, itemModifiers(inv, reg.items, reg.synergies, reg.transformations), STAT_LIMITS);
    expect(after.orbit).toBe(1);
    expect(after.damage).toBeCloseTo(BASE_STATS.damage * 1.3);
  });
});

/** How big a stat change is, relative to Morty's base stats. */
function statChange(key: string, add: number, mult: number): number {
  const base = BASE_STATS[key] ?? 0;
  const fromAdd = base ? Math.abs(add) / Math.abs(base) : 0;
  return Math.max(fromAdd, Math.abs(mult - 1));
}

describe('item rules', () => {
  const all = [...reg.items.values()];
  const feel: ItemEffect[] = ['shots', 'companion', 'on-hit', 'on-kill', 'on-dash', 'on-hurt', 'look', 'mechanic', 'stat'];

  it('every item says in one plain line what it does, and declares what it changes', () => {
    for (const i of all) {
      expect(i.effect.length, i.id).toBeGreaterThan(10);
      expect(i.effect, i.id).not.toBe(i.blurb);
      expect(i.tags.length, i.id).toBeGreaterThan(0);
    }
  });

  it('every passive changes what Morty does or sees', () => {
    for (const i of all.filter((x) => x.kind === 'passive')) expect(i.tags.some((t) => feel.includes(t)), i.id).toBe(true);
  });

  it("tags are honest: each one is backed by what the item actually does", () => {
    const hookFor: Partial<Record<ItemEffect, (keyof NonNullable<ItemDef['hooks']>)[]>> = {
      'on-hit': ['onHit'],
      'on-kill': ['onKill'],
      'on-dash': ['onDash', 'onDashContact'],
      'on-hurt': ['onDamageTaken'],
    };
    const behavior = new Set(ITEM_RULES.behaviorStats);
    for (const i of all) {
      const statKeys = [...Object.keys(i.stats?.add ?? {}), ...Object.keys(i.stats?.mult ?? {})];
      for (const t of i.tags) {
        const why = `${i.id} tagged ${t}`;
        if (t === 'companion') expect(i.companion, why).toBeDefined();
        if (t === 'look') expect(i.look, why).toBeDefined();
        if (t === 'room') expect(i.kind, why).toBe('active');
        if (t === 'stat') expect(statKeys.some((k) => !behavior.has(k)), why).toBe(true);
        if (t === 'shots') expect(i.kind === 'weapon' || statKeys.some((k) => behavior.has(k)) || !!i.hooks?.onFire, why).toBe(true);
        const hooks = hookFor[t];
        if (hooks) {
          const backed = hooks.some((h) => !!i.hooks?.[h]) || (t === 'on-hit' && statKeys.some((k) => ['poisonChance', 'chain', 'slowChance', 'freezeChance'].includes(k))) || (t === 'on-dash' && statKeys.includes('dashEraseShots'));
          expect(backed, why).toBe(true);
        }
      }
    }
  });

  it(`never makes a plain stat change under ${ITEM_RULES.minStatChange * 100}%, and a stat-only item needs one of ${ITEM_RULES.bigStatChange * 100}% or a heart`, () => {
    const behavior = new Set(ITEM_RULES.behaviorStats);
    for (const i of all.filter((x) => x.kind === 'passive' && x.stats)) {
      const add = i.stats!.add ?? {};
      const mult = i.stats!.mult ?? {};
      const keys = [...new Set([...Object.keys(add), ...Object.keys(mult)])].filter((k) => !behavior.has(k));
      for (const k of keys) {
        const change = k === 'maxHearts' ? (add[k] ?? 0) : statChange(k, add[k] ?? 0, mult[k] ?? 1);
        const floor = k === 'maxHearts' ? ITEM_RULES.bigHearts : ITEM_RULES.minStatChange;
        expect(change, `${i.id}: ${k}`).toBeGreaterThanOrEqual(floor - 1e-9);
      }
      const statOnly = i.tags.every((t) => t === 'stat');
      if (statOnly) {
        const big = keys.some((k) => (k === 'maxHearts' ? (add[k] ?? 0) >= ITEM_RULES.bigHearts : statChange(k, add[k] ?? 0, mult[k] ?? 1) >= ITEM_RULES.bigStatChange - 1e-9));
        expect(big, `${i.id} is only stats, so one change must be big`).toBe(true);
      }
    }
  });

  it('active items are big: every one changes the room', () => {
    for (const i of all.filter((x) => x.kind === 'active')) expect(i.tags, i.id).toContain('room');
  });

  it('every boss drops a rare item', () => {
    for (const ep of reg.episodes.values()) {
      for (const act of episodeActs(ep)) {
        for (const f of act.finale) {
          if (f.kind !== 'boss') continue;
          const reward = reg.enemies.get(f.boss)?.boss?.reward;
          expect(reward, f.boss).toBeDefined();
          expect(reg.items.get(reward!)?.rarity, f.boss).toBe('rare');
        }
      }
    }
  });

  it('gives the Pilot at least 20 items to find, with companions, looks and every kind of shot change', () => {
    const pilot = all.filter((i) => i.firstAppears === 'S01E01' && !i.noPool);
    expect(pilot.length).toBeGreaterThanOrEqual(20);
    expect(pilot.some((i) => i.companion)).toBe(true);
    expect(pilot.some((i) => i.look)).toBe(true);
    const shotStats = new Set(pilot.flatMap((i) => Object.keys(i.stats?.add ?? {})));
    for (const k of ['pierce', 'homing', 'split', 'blast', 'chain', 'orbit', 'chargeShot', 'critRate', 'freezeRate', 'ricochet']) expect(shotStats, k).toContain(k);
  });
});
