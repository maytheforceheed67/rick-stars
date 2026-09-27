import { describe, expect, it, vi } from 'vitest';
import { BASE_STATS, STAT_LIMITS } from '../src/content/balance';
import { createRegistry, LISTINGS } from '../src/content/registry';
import { activeTransformations, hookSources, itemModifiers, runHook } from '../src/engine/effects/hooks';
import { Inventory } from '../src/engine/effects/inventory';
import { computeStats } from '../src/engine/effects/stats';
import { compareEpisodes, nextUp } from '../src/engine/episodes';
import { itemPoolFor } from '../src/engine/pools';
import { actEnemies, episodeActs, validateRegistry } from '../src/engine/registry';
import type { ContentMeta, EnemyRef, EpisodeDef, GameCtx, HitInfo, ItemDef } from '../src/engine/types';

const reg = createRegistry();
const dog = reg.episodes.get('S01E02') as EpisodeDef;
const pilot = reg.episodes.get('S01E01') as EpisodeDef;
const acts = episodeActs(dog);
const item = (id: string) => reg.items.get(id) as ItemDef;
const fights = acts.filter((a) => a.enemyPool.length > 0 || a.finale.some((f) => f.kind === 'boss'));

describe('Lawnmower Dog: the story', () => {
  it('plays the episode in order, cutting away to Jerry and Snuffles twice', () => {
    expect(acts.map((a) => `${a.id} (${a.playable})`)).toEqual([
      'dog-prologue (morty)',
      'dog-plane (morty)',
      'dog-meanwhile-snuffles (jerry)',
      'dog-dreams (morty)',
      'dog-terry-dream (morty)',
      'dog-meanwhile-dogs (jerry)',
      'dog-epilogue (morty)',
    ]);
  });

  it('keeps the cutaways quiet: Jerry never fights, finds loot or gets a weapon', () => {
    const cutaways = acts.filter((a) => a.interlude);
    expect(cutaways.map((a) => a.id)).toEqual(['dog-meanwhile-snuffles', 'dog-meanwhile-dogs']);
    for (const a of cutaways) {
      expect(a.playable, a.id).toBe('jerry');
      expect(a.unarmed, a.id).toBe(true);
      expect(a.weapon, a.id).toBeUndefined();
      expect(a.enemyPool, a.id).toEqual([]);
      expect(a.itemPool, a.id).toEqual([]);
      // Each one ends on a story beat, not a fight.
      expect(a.finale.every((f) => f.kind === 'encounter'), a.id).toBe(true);
    }
  });

  it("won't let a cutaway pick a fight", () => {
    const i = dog.acts.findIndex((a) => a.id === 'dog-meanwhile-snuffles');
    const saved = dog.acts[i];
    try {
      dog.acts[i] = { ...saved, enemyPool: [{ id: 'dream-soldier', weight: 1 }] };
      expect(validateRegistry(reg).some((e) => e.includes("can't have an enemy pool"))).toBe(true);
      dog.acts[i] = { ...saved, unarmed: false };
      expect(validateRegistry(reg).some((e) => e.includes('mark it unarmed'))).toBe(true);
    } finally {
      dog.acts[i] = saved;
    }
    expect(validateRegistry(reg)).toEqual([]);
  });

  it('hands Morty a weapon each time the story gives him one, and takes it away for the quiet parts', () => {
    const beats = acts.map((a) => (a.weapon ? `${a.weapon.item} (${a.weapon.when}, ${a.weapon.from})` : a.unarmed ? 'unarmed' : 'none'));
    expect(beats).toEqual([
      'unarmed',
      // Lucid in Goldenfold's dream: Morty imagines himself a gun.
      'imagined-ray-gun (start, morty)',
      'unarmed',
      'rubber-duck-launcher (start, morty)',
      'laser-cat (start, morty)',
      'unarmed',
      // Awake in Snowball's world: Rick smuggles in the one thing dogs can't resist.
      'tennis-ball-launcher (start, rick)',
    ]);
    // Dream weapons are made up; none of them is loot.
    for (const a of fights) {
      expect(item(a.weapon!.item).canon, a.id).toBe(false);
      expect(item(a.weapon!.item).noPool, a.id).toBe(true);
    }
  });

  it('ends each boss the way the show does: nobody dies, the dreamer gives in', () => {
    for (const id of ['dream-goldenfold', 'snowball']) {
      const boss = reg.enemies.get(id)!;
      expect(boss.firstAppears, id).toBe('S01E02');
      expect(boss.boss?.dazed, id).toBeTypeOf('function');
    }
  });
});

describe('Lawnmower Dog: content', () => {
  it('brings 20+ items, 6+ synergies, a transformation, and 6+ enemy types for every fight', () => {
    const items = [...reg.items.values()].filter((i) => i.firstAppears === 'S01E02' && !i.noPool);
    expect(items.length).toBeGreaterThanOrEqual(20);
    expect(reg.synergies.filter((s) => s.firstAppears === 'S01E02').length).toBeGreaterThanOrEqual(6);
    expect(reg.transformations.filter((t) => t.firstAppears === 'S01E02').map((t) => t.id)).toEqual(['lucid-dreamer']);
    expect(fights.map((a) => a.id)).toEqual(['dog-plane', 'dog-dreams', 'dog-terry-dream', 'dog-epilogue']);
    for (const a of fights) {
      const kinds = actEnemies(reg, a).filter((e) => !e.boss);
      expect(kinds.length, a.id).toBeGreaterThanOrEqual(6);
    }
  });

  it('gates its canon characters and gear at S01E02, and keeps Mr. Goldenfold a Pilot character', () => {
    for (const id of ['snuffles', 'snowball', 'scary-terry', 'mrs-pancakes', 'centaur', 'little-girl']) {
      const c = reg.characters.get(id);
      expect(c, id).toBeDefined();
      expect(c!.firstAppears, id).toBe('S01E02');
      expect(c!.canon, id).toBe(true);
    }
    for (const id of ['snuffles-helmet', 'dream-inceptor']) {
      expect(item(id).firstAppears, id).toBe('S01E02');
      expect(item(id).canon, id).toBe(true);
    }
    expect(reg.characters.get('goldenfold')?.firstAppears).toBe('S01E01');
  });

  it('uses nothing from S01E03 or later, and nothing it adds leaks back into the Pilot', () => {
    const c = dog.content;
    const metas: ContentMeta[] = [
      ...c.characters,
      ...c.items,
      ...c.synergies,
      ...(c.transformations ?? []),
      ...c.statuses,
      ...c.enemies,
      ...c.encounters,
      ...c.specialRooms,
      ...c.mechanics,
    ];
    expect(metas.length).toBeGreaterThan(50);
    for (const m of metas) expect(compareEpisodes(m.firstAppears, 'S01E02'), m.id).toBeLessThanOrEqual(0);
    // Everything the Pilot can roll or fight is still Pilot content.
    for (const a of episodeActs(pilot)) {
      for (const w of [...a.enemyPool, ...a.itemPool]) {
        const meta = reg.items.get(w.id) ?? reg.enemies.get(w.id);
        expect(meta?.firstAppears, `${a.id}: ${w.id}`).toBe('S01E01');
      }
    }
  });

  it('unlocks two items on a clear (into its own pool, never the Pilot\'s) and calls Anatomy Park next', () => {
    expect(dog.unlocksOnClear?.length).toBeGreaterThanOrEqual(2);
    const unlocked = new Set(dog.unlocksOnClear);
    const dreams = acts.find((a) => a.id === 'dog-dreams')!;
    for (const id of dog.unlocksOnClear!) {
      expect(item(id).locked, id).toBe(true);
      expect(itemPoolFor(reg, 'S01E02', dreams, new Set(), new Set()).map((w) => w.id), id).not.toContain(id);
      expect(itemPoolFor(reg, 'S01E02', dreams, unlocked, new Set()).map((w) => w.id), id).toContain(id);
      expect(itemPoolFor(reg, 'S01E01', pilot.acts[0], unlocked, new Set()).map((w) => w.id), id).not.toContain(id);
    }
    const cleared = (ids: string[]) => (id: string) => ids.includes(id);
    expect(nextUp(LISTINGS, cleared(['S01E01', 'S01E02']))?.title).toBe('Anatomy Park');
  });

  it("makes Scary Terry a stalker: he can't be killed, only knocked dizzy for a while", () => {
    const terry = reg.enemies.get('scary-terry')!;
    expect(terry.stalker).toBeDefined();
    expect(terry.stalker!.staggerHits).toBeGreaterThanOrEqual(1);
    expect(terry.stalker!.staggerSeconds).toBeGreaterThan(0);
    expect(terry.boss).toBeUndefined();
    // He hunts through the mechanic, never from the random enemy pool.
    for (const a of acts) expect(a.enemyPool.map((w) => w.id), a.id).not.toContain('scary-terry');
  });
});

// ---- items that do things ---------------------------------------------------------------------------

function mockCtx(enemies: EnemyRef[]): GameCtx {
  return {
    rng: { chance: () => true, angle: () => 0, float: (a: number) => a, next: () => 0 },
    player: { x: 0, y: 0, heal: vi.fn() },
    enemies: () => enemies,
    damageEnemy: vi.fn(),
    pushEnemies: vi.fn(),
    stun: vi.fn(),
    vfx: vi.fn(),
    sfx: vi.fn(),
  } as unknown as GameCtx;
}

const foe = (id: string, x: number, y: number, extra: object = {}) =>
  ({ uid: `${id}@${x},${y}`, x, y, alive: true, def: { id, ...extra } }) as unknown as EnemyRef;
const shotHit = (h: Partial<HitInfo> = {}): HitInfo => ({ source: 'shot', damage: 4, wasFrozen: false, killed: false, ...h });

describe('Lawnmower Dog: items', () => {
  it("Terry's Finger Blades slash whoever stands next to the target, for half damage", () => {
    const target = foe('dream-passenger', 100, 100);
    const beside = foe('dream-passenger', 150, 100);
    const far = foe('dream-passenger', 400, 100);
    const ctx = mockCtx([target, beside, far]);
    const inv = new Inventory('imagined-ray-gun');
    inv.add(item('terrys-finger-blades'));
    runHook(hookSources(inv, reg.items, reg.synergies), 'onHit', ctx, target, shotHit());
    expect(ctx.damageEnemy).toHaveBeenCalledTimes(1);
    expect(ctx.damageEnemy).toHaveBeenCalledWith(beside, 2, 'slash');
  });

  it('the Emergency Parachute pops when Morty is hurt, shoving back and dazing whoever is close', () => {
    const close = foe('dream-passenger', 60, 0);
    const far = foe('dream-passenger', 600, 0);
    const ctx = mockCtx([close, far]);
    const inv = new Inventory('imagined-ray-gun');
    inv.add(item('emergency-parachute'));
    runHook(hookSources(inv, reg.items, reg.synergies), 'onDamageTaken', ctx, 1, 'Dream Passenger');
    expect(ctx.pushEnemies).toHaveBeenCalledOnce();
    expect(ctx.stun).toHaveBeenCalledTimes(1);
    expect(ctx.stun).toHaveBeenCalledWith(close, expect.any(Number));
  });

  it('tennis balls make dogs stop and chase, but never Snowball in his war suit', () => {
    const pup = foe('helmet-pup', 50, 0);
    const snowball = foe('snowball', 50, 0, { boss: {} });
    const ctx = mockCtx([pup, snowball]);
    const inv = new Inventory('tennis-ball-launcher');
    const sources = hookSources(inv, reg.items, reg.synergies);
    runHook(sources, 'onHit', ctx, pup, shotHit());
    runHook(sources, 'onHit', ctx, snowball, shotHit());
    runHook(sources, 'onHit', ctx, pup, shotHit({ killed: true }));
    expect(ctx.stun).toHaveBeenCalledTimes(1);
    expect(ctx.stun).toHaveBeenCalledWith(pup, expect.any(Number));
  });

  it('Lucid Dreamer takes any three of its six dream items, and hits harder once it does', () => {
    const t = reg.transformations.find((x) => x.id === 'lucid-dreamer')!;
    expect(t.set).toHaveLength(6);
    const inv = new Inventory('imagined-ray-gun');
    const stats = () => computeStats(BASE_STATS, itemModifiers(inv, reg.items, reg.synergies, reg.transformations), STAT_LIMITS);
    inv.add(item('sheep-plush'));
    inv.add(item('nightmare-teddy'));
    const before = stats();
    expect(activeTransformations(inv.owned(), reg.transformations).map((x) => x.id)).not.toContain('lucid-dreamer');
    inv.add(item('pancakes-autograph'));
    expect(activeTransformations(inv.owned(), reg.transformations).map((x) => x.id)).toContain('lucid-dreamer');
    expect(stats().damage).toBeCloseTo(before.damage * 1.25);
  });
});
