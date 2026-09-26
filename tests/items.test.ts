import { describe, expect, it, vi } from 'vitest';
import { BASE_STATS, STAT_LIMITS } from '../src/content/balance';
import { createRegistry } from '../src/content/registry';
import { activeSynergies, hookSources, itemModifiers, runHook } from '../src/engine/effects/hooks';
import { Inventory } from '../src/engine/effects/inventory';
import { computeStats } from '../src/engine/effects/stats';
import { StatusManager } from '../src/engine/effects/status';
import { Rng } from '../src/engine/rng';
import type { EnemyRef, GameCtx, HitInfo } from '../src/engine/types';

const reg = createRegistry();
const item = (id: string) => reg.items.get(id)!;

function mockCtx(): GameCtx & { shots: number; frozen: string[] } {
  const ctx = {
    rng: new Rng('mock'),
    shots: 0,
    frozen: [] as string[],
    playerShot: () => void ctx.shots++,
    freeze: (e: EnemyRef) => void ctx.frozen.push(String(e.uid)),
    sfx: () => undefined,
    damageEnemy: vi.fn(),
    poison: vi.fn(),
  };
  return ctx as unknown as GameCtx & { shots: number; frozen: string[] };
}

const enemy = { uid: 7, x: 10, y: 10, alive: true } as EnemyRef;
const hit = (h: Partial<HitInfo>): HitInfo => ({ source: 'shot', damage: 3, wasFrozen: false, killed: false, ...h });

describe('stats', () => {
  it('adds first, then multiplies, then clamps', () => {
    const s = computeStats({ damage: 3, fireRate: 3 }, [{ add: { damage: 1 } }, { mult: { damage: 2 } }, { add: { damage: 1 }, mult: { fireRate: 100 } }], { fireRate: [0.5, 12] });
    expect(s.damage).toBe((3 + 1 + 1) * 2);
    expect(s.fireRate).toBe(12);
  });

  it('stacks item stats (including weapons) on the base stats', () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('calculator'));
    inv.add(item('letterman-jacket'));
    inv.add(item('answer-key'));
    const s = computeStats(BASE_STATS, itemModifiers(inv, reg.items, reg.synergies), STAT_LIMITS);
    expect(s.damage).toBeCloseTo((BASE_STATS.damage + 1) * 1.2);
    expect(s.maxHearts).toBe(BASE_STATS.maxHearts + 1);
    inv.add(item('ricks-ray-gun'));
    const s2 = computeStats(BASE_STATS, itemModifiers(inv, reg.items, reg.synergies), STAT_LIMITS);
    expect(s2.damage).toBeCloseTo((BASE_STATS.damage + 1) * 1.2 * 1.5);
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
    expect(ctx.damageEnemy).toHaveBeenCalledWith(enemy, 10, 'slash');
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

  it('Dodge, Dip, Dissolve poisons bounced shots', () => {
    const inv = new Inventory('ricks-spare-ray-gun');
    inv.add(item('chemistry-set'));
    inv.add(item('dodgeball'));
    const ctx = mockCtx();
    const sources = hookSources(inv, reg.items, reg.synergies);
    runHook(sources, 'onHit', ctx, enemy, hit({ bounced: false }));
    expect(ctx.poison).not.toHaveBeenCalled();
    runHook(sources, 'onHit', ctx, enemy, hit({ bounced: true }));
    expect(ctx.poison).toHaveBeenCalledOnce();
  });
});
