import { describe, expect, it } from 'vitest';
import { TRACKS } from '../src/engine/audio/music';
import { createRegistry, LISTINGS } from '../src/content/registry';
import { availableIn, compareEpisodes, nextUp } from '../src/engine/episodes';
import { itemPoolFor } from '../src/engine/pools';
import { episodeActs, validateRegistry } from '../src/engine/registry';
import type { ContentMeta, EpisodeDef } from '../src/engine/types';

const reg = createRegistry();
const pilot = reg.episodes.get('S01E01') as EpisodeDef;

describe('content registry', () => {
  it('validates with no problems (ids resolve, templates are sound, canon gating holds)', () => {
    expect(validateRegistry(reg)).toEqual([]);
  });

  it('lists all of Season 1, with only the Pilot playable for now', () => {
    const s1 = LISTINGS.filter((l) => l.season === 1);
    expect(s1).toHaveLength(11);
    expect(s1.filter((l) => l.def).map((l) => l.id)).toEqual(['S01E01']);
    expect(s1[1].title).toBe('Lawnmower Dog');
  });

  it('calls the episode after the furthest clear "next up" (Lawnmower Dog once the Pilot is done)', () => {
    const cleared = (ids: string[]) => (id: string) => ids.includes(id);
    expect(nextUp(LISTINGS, cleared([]))).toBeNull();
    expect(nextUp(LISTINGS, cleared(['S01E01']))?.title).toBe('Lawnmower Dog');
    expect(nextUp(LISTINGS, cleared(['S01E01', 'S01E03']))?.id).toBe('S01E04');
    expect(nextUp(LISTINGS, cleared(['S01E11']))).toBeNull();
  });

  it('gives the Pilot at least 20 items and 12+ combat rooms per act', () => {
    expect(pilot.content.items.length).toBeGreaterThanOrEqual(20);
    for (const act of pilot.acts) {
      if (act.layout.kind === 'procedural') expect(act.layout.templates.length).toBeGreaterThanOrEqual(12);
    }
  });

  it("lets episodes bring their own music (the Pilot's act tracks live in its folder)", () => {
    expect(Object.keys(TRACKS)).not.toContain('school');
    for (const act of episodeActs(pilot)) expect(reg.music.has(act.biome.music), act.id).toBe(true);
    expect(reg.music.has('school')).toBe(true);
  });

  it('has no generic exits: every act but the last leaves by ship, portal or departure', () => {
    for (const ep of reg.episodes.values()) {
      const acts = episodeActs(ep);
      acts.slice(0, -1).forEach((act) => {
        expect(act.travel, `${ep.id} ${act.id}`).toBeDefined();
        expect(['ship', 'portal', 'departure']).toContain(act.travel!.by);
      });
    }
    const broken = { ...pilot.acts[0], travel: undefined };
    const saved = pilot.acts[0];
    pilot.acts[0] = broken;
    try {
      expect(validateRegistry(reg).some((e) => e.includes('ActDef.travel'))).toBe(true);
    } finally {
      pilot.acts[0] = saved;
    }
  });

  it('keeps every cutscene between 2 and 6 panels', () => {
    for (const cs of reg.cutscenes.values()) {
      expect(cs.panels.length, cs.id).toBeGreaterThanOrEqual(2);
      expect(cs.panels.length, cs.id).toBeLessThanOrEqual(6);
    }
  });

  it('marks invented content as non-canon and keeps episode ids well-formed', () => {
    const metas: ContentMeta[] = [...reg.items.values(), ...reg.enemies.values(), ...reg.statuses.values(), ...reg.mechanics.values()];
    for (const m of metas) {
      expect(typeof m.canon, m.id).toBe('boolean');
      expect(m.firstAppears, m.id).toMatch(/^S\d{2}E\d{2}$/);
    }
    expect(reg.items.get('dodgeball')?.canon).toBe(false);
    expect(reg.items.get('neutrino-bomb')?.canon).toBe(true);
    expect(reg.enemies.get('frank-palicky')?.canon).toBe(true);
  });
});

describe('canon gating', () => {
  it('no episode (the Pilot included) pulls in content that first appears later', () => {
    for (const ep of reg.episodes.values()) {
      for (const act of episodeActs(ep)) {
        const ids = [
          ...act.enemyPool.map((w) => w.id),
          ...act.itemPool.map((w) => w.id),
          ...act.mechanics,
          act.rick.gadget,
          ...act.finale.map((s) => (s.kind === 'boss' ? s.boss : s.encounter)),
        ];
        for (const id of ids) {
          const meta = reg.items.get(id) ?? reg.enemies.get(id) ?? reg.mechanics.get(id) ?? reg.gadgets.get(id) ?? reg.encounters.get(id);
          expect(meta, id).toBeDefined();
          expect(compareEpisodes(meta!.firstAppears, ep.id), `${ep.id} ${act.id}: ${id}`).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it('keeps later-episode items out of earlier episodes even when unlocked', () => {
    const future = { ...reg.items.get('calculator')!, id: 'plumbus-test', firstAppears: 'S02E08' as const };
    reg.items.set(future.id, future);
    try {
      const pool = itemPoolFor(reg, 'S01E01', pilot.acts[0], new Set(['plumbus-test', 'mega-seed']), new Set());
      expect(pool.map((w) => w.id)).not.toContain('plumbus-test');
      expect(pool.map((w) => w.id)).toContain('mega-seed');
      expect(availableIn(future, 'S02E08')).toBe(true);
      expect(availableIn(future, 'S02E07')).toBe(false);
    } finally {
      reg.items.delete(future.id);
    }
  });

  it('holds locked items back until they are unlocked', () => {
    const locked = itemPoolFor(reg, 'S01E01', pilot.acts[0], new Set(), new Set()).map((w) => w.id);
    expect(locked).not.toContain('mega-seed');
    expect(locked).not.toContain('burp-canister');
    const unlocked = itemPoolFor(reg, 'S01E01', pilot.acts[0], new Set(['burp-canister']), new Set()).map((w) => w.id);
    expect(unlocked).toContain('burp-canister');
  });

  it('never offers story gear, items the player owns, or what a shop already stocks', () => {
    const pool = itemPoolFor(reg, 'S01E01', pilot.acts[1], new Set(), new Set(['hopper-legs'])).map((w) => w.id);
    expect(pool).not.toContain('hopper-legs');
    expect(pool).not.toContain('grappling-shoes');
    expect(pool).not.toContain('ricks-ray-gun');
    const shelf = itemPoolFor(reg, 'S01E01', pilot.acts[0], new Set(), new Set(), { exclude: ['mystery-meat'] }).map((w) => w.id);
    expect(shelf).not.toContain('mystery-meat');
    expect(shelf).toContain('dodgeball');
  });
});

describe('determinism rule', () => {
  it('nothing in src calls Math.random (every random call goes through Rng)', () => {
    // Raw source text of every module, bundled by Vite so the test needs no Node APIs.
    const sources = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const files = Object.keys(sources);
    expect(files.length).toBeGreaterThan(40);
    expect(files.filter((f) => /Math\.random\s*\(/.test(sources[f]))).toEqual([]);
  });
});
