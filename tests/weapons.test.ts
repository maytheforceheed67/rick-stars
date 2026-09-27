import { describe, expect, it } from 'vitest';
import { BASE_STATS, ENEMIES, STAT_LIMITS } from '../src/content/balance';
import { createRegistry } from '../src/content/registry';
import { itemModifiers, weaponModifiers } from '../src/engine/effects/hooks';
import { Inventory } from '../src/engine/effects/inventory';
import { computeStats } from '../src/engine/effects/stats';
import { actEnemies, episodeActs } from '../src/engine/registry';
import type { ActDef, EpisodeDef, ItemDef } from '../src/engine/types';

const reg = createRegistry();
const episodes = [...reg.episodes.values()];
const pilot = reg.episodes.get('S01E01') as EpisodeDef;

const fights = (act: ActDef) => act.enemyPool.length > 0 || act.finale.some((f) => f.kind === 'boss');
const item = (id: string) => reg.items.get(id) as ItemDef;
/** Morty's stats holding an act's story weapon and nothing else. */
const statsWith = (act: ActDef) => computeStats(BASE_STATS, [weaponModifiers(item(act.weapon!.item).weapon)], STAT_LIMITS);
const within = (n: number, [lo, hi]: [number, number]) => n >= lo && n <= hi;

describe('story weapons', () => {
  it('gives every act with enemies a weapon, handed over on screen by someone with a line', () => {
    for (const ep of episodes) {
      for (const act of episodeActs(ep)) {
        if (!fights(act)) continue;
        expect(act.weapon, act.id).toBeDefined();
        const w = act.weapon!;
        expect(item(w.item)?.kind, act.id).toBe('weapon');
        // Story gear: never random loot.
        expect(item(w.item).noPool, act.id).toBe(true);
        expect(reg.characters.has(w.from), act.id).toBe(true);
        expect(w.line.length, act.id).toBeGreaterThan(10);
      }
    }
  });

  it('follows the Pilot: garage junk, dodgeballs, the spare ray gun, then Rick hands over his own', () => {
    const beats = episodeActs(pilot).map((a) => (a.weapon ? `${a.weapon.item} (${a.weapon.when})` : a.unarmed ? 'unarmed' : 'none'));
    expect(beats).toEqual([
      'garage-junk (scripted)',
      'gym-bag-dodgeballs (start)',
      'ricks-spare-ray-gun (start)',
      'ricks-ray-gun (scripted)',
      'unarmed',
    ]);
    // No guns at school: Morty throws things there.
    expect(item(pilot.acts[0].weapon!.item).weapon?.style).toBe('thrown');
    expect(item(pilot.prologue!.weapon!.item).weapon?.style).toBe('thrown');
    // Customs' gun is canon (Rick hands it over when the cover is blown).
    expect(item('ricks-ray-gun').canon).toBe(true);
  });

  it('has code in the episode for every scripted hand-over', () => {
    const sources = import.meta.glob('../src/content/episodes/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    for (const ep of episodes) {
      const scripted = episodeActs(ep).filter((a) => a.weapon?.when === 'scripted').length;
      const folder = `/episodes/${ep.id.toLowerCase()}-`;
      const calls = Object.entries(sources)
        .filter(([path]) => path.includes(folder))
        .reduce((n, [, text]) => n + (text.match(/giveActWeapon\(\)/g)?.length ?? 0), 0);
      expect(calls, ep.id).toBeGreaterThanOrEqual(scripted);
    }
  });

  it('swaps one story weapon for the next while items that change shots carry over', () => {
    const inv = new Inventory();
    expect(inv.weapon).toBeNull();
    expect(inv.owned()).toEqual([]);
    inv.add(item('garage-junk'));
    inv.add(item('freeze-ray-mod'));
    inv.add(item('gym-bag-dodgeballs'));
    expect(inv.weapon).toBe('gym-bag-dodgeballs');
    expect(inv.passives).toEqual(['freeze-ray-mod']);
    const withBalls = computeStats(BASE_STATS, itemModifiers(inv, reg.items, reg.synergies), STAT_LIMITS);
    expect(withBalls.bounces).toBe(1);
    expect(withBalls.freezeRate).toBeGreaterThan(0);
    inv.add(item('ricks-spare-ray-gun'));
    const withGun = computeStats(BASE_STATS, itemModifiers(inv, reg.items, reg.synergies), STAT_LIMITS);
    // The bounce belonged to the dodgeballs; the freeze mod works on whatever Morty holds.
    expect(withGun.bounces).toBe(0);
    expect(withGun.freezeRate).toBe(withBalls.freezeRate);
  });
});

describe('hits to kill', () => {
  it(`takes ${ENEMIES.hitsToKill.regular.join('-')} hits for regular enemies and ${ENEMIES.hitsToKill.elite.join('-')} for elites, with each act's weapon`, () => {
    let checked = 0;
    for (const ep of episodes) {
      for (const act of episodeActs(ep)) {
        if (!act.weapon) continue;
        const damage = statsWith(act).damage;
        for (const e of actEnemies(reg, act)) {
          // Bosses have their own test; hazards and stalkers can't be killed.
          if (e.boss || e.hazard || e.stalker) continue;
          const hits = Math.ceil(e.hp / damage - 1e-9);
          expect(within(hits, ENEMIES.hitsToKill.regular), `${act.id}: ${e.id} takes ${hits} hits`).toBe(true);
          if (e.elite) {
            const eliteHits = Math.ceil((e.hp * e.elite.hpMult) / damage - 1e-9);
            expect(within(eliteHits, ENEMIES.hitsToKill.elite), `${act.id}: elite ${e.id} takes ${eliteHits} hits`).toBe(true);
          }
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it(`keeps boss fights to ${ENEMIES.bossFight.seconds.join('-')} seconds with the act's weapon`, () => {
    let bosses = 0;
    for (const ep of episodes) {
      for (const act of episodeActs(ep)) {
        for (const f of act.finale) {
          if (f.kind !== 'boss') continue;
          const boss = reg.enemies.get(f.boss)!;
          const st = statsWith(act);
          const seconds = boss.hp / (st.damage * st.fireRate * ENEMIES.bossFight.hitRate);
          expect(within(seconds, ENEMIES.bossFight.seconds), `${boss.id}: ${seconds.toFixed(0)} s`).toBe(true);
          bosses++;
        }
      }
    }
    expect(bosses).toBeGreaterThanOrEqual(2);
  });
});
